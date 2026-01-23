import { Response } from "express";
import { PaginationMeta } from "./query_builder.utils";

type TSendResponse<T> = {
  success: boolean;
  statusCode: number;
  message: string;
  meta?: PaginationMeta;
  data: T;
};

const sendResponse = <T>(res: Response, data: TSendResponse<T>) => {
  return res.status(data.statusCode).json({
    success: data.success,
    statusCode: data.statusCode,
    message: data.message,
    ...(data.meta && { meta: data.meta }),
    data: data.data,
  });
};

export default sendResponse;
