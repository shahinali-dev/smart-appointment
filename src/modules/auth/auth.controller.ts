import { Router } from "express";
import httpStatus from "http-status";
import config from "../../config";
import { isAuth } from "../../middleware/is_auth";
import catchAsync from "../../utils/catch_async.utils";
import { authService } from "./auth.service";

const router = Router();

router.post(
  "/signin",
  catchAsync(async (req, res) => {
    const userData = req.body;
    const user = await authService.signIn(userData);

    res.cookie("access-token", user.accessToken, {
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 1 * 24 * 60 * 60 * 1000,
    });

    res.cookie("refresh-token", user.refreshToken, {
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(httpStatus.OK).json({
      success: true,
      statusCode: httpStatus.OK,
      message: "User logged in successfully",
      data: user.user,
    });
  }),
);

router.get(
  "/user-info",
  isAuth,
  catchAsync(async (req, res) => {
    const userId = req.user!._id;
    const user = await authService.getAuthUser(userId);
    res.status(httpStatus.OK).json({
      success: true,
      statusCode: httpStatus.OK,
      message: "User info fetched successfully",
      data: user,
    });
  }),
);

router.post(
  "/signout",
  catchAsync(async (req, res) => {
    res.clearCookie("access-token");
    res.clearCookie("refresh-token");
    res.status(httpStatus.OK).json({
      success: true,
      statusCode: httpStatus.OK,
      message: "User logged out successfully",
    });
  }),
);

export const authRoute = router;
