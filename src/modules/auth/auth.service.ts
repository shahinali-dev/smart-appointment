/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
import httpStatus from "http-status";
import { Types } from "mongoose";
import config from "../../config";
import { AppError } from "../../errors/app_error";
import createToken from "../../utils/create_token";
import passwordUtils from "../../utils/password_utils";
import { ISignIn } from "../user/user.interface";
import UserModel from "../user/user.model";
import { userService } from "../user/user.service";

export class AuthService {
  async signIn(payload: ISignIn) {
    const existingUser = await userService.isExist(payload.email);
    if (!existingUser) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid email");
    }

    const isMatch = await passwordUtils.compare(
      payload.password as string,
      existingUser.password as string,
    );

    if (!isMatch) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid email or password");
    }

    const { password, ...rest } = existingUser.toJSON();

    const jwtPayload = {
      _id: rest._id,
      email: rest.email,
    };

    const accessToken = createToken(
      jwtPayload,
      config.JWT_ACCESS_SECRET as string,
      config.JWT_ACCESS_EXPIRE_IN as string,
    );

    const refreshToken = createToken(
      jwtPayload,
      config.JWT_REFRESH_SECRET as string,
      config.JWT_REFRESH_EXPIRE_IN as string,
    );

    return { user: rest, accessToken, refreshToken };
  }

  async getAuthUser(id: Types.ObjectId) {
    const user = await UserModel.findById(id).select("-password");
    return user;
  }
}

export const authService = new AuthService();
