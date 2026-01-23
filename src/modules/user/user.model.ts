import { model, Schema } from "mongoose";
import { Role } from "./user.enum";
import { IUser } from "./user.interface";

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: {
      type: String,
      enum: Object.values(Role),
      default: Role.USER,
    },
    password: {
      type: String,
      required: true,
    },

    avatar: { type: String },
  },
  {
    timestamps: true,
  },
);

const UserModel = model<IUser>("User", userSchema);

export default UserModel;
