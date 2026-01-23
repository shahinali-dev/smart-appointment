/* eslint-disable no-unused-vars */

export interface IUser {
  name: string;
  email: string;
  password: string;
  avatar?: string;
}

export interface ISignIn {
  email: string;
  password: string;
}

export interface IAuthUser {
  _id: string;
  name: string;
  email: string;
  provider: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
  iat: number;
  exp: number;
}
