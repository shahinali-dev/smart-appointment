/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from "mongoose";
import { ActivityLogType } from "./activity_log.enum";

export interface IActivityLog {
  type: ActivityLogType;
  message: string;
  appointment?: Types.ObjectId;
  staff?: Types.ObjectId;
  customerName?: string;
  createdBy: string;
  metadata?: Record<string, any>;
}

export interface IActivityLogFilters {
  type?: ActivityLogType;
  appointment?: string;
  staff?: string;
  startDate?: string;
  endDate?: string;
}
