import { model, Schema } from "mongoose";
import { ActivityLogType } from "./activity_log.enum";
import { IActivityLog } from "./activity_log.interface";

const activityLogSchema = new Schema<IActivityLog>(
  {
    type: {
      type: String,
      enum: Object.values(ActivityLogType),
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    appointment: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },
    staff: {
      type: Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
    },
    customerName: {
      type: String,
      default: null,
    },
    createdBy: {
      type: String,
      required: true,
      ref: "User",
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for better performance
activityLogSchema.index({ createdBy: 1, createdAt: -1 });
activityLogSchema.index({ type: 1 });
activityLogSchema.index({ appointment: 1 });
activityLogSchema.index({ staff: 1 });
activityLogSchema.index({ createdAt: -1 });

// Compound index for common queries
activityLogSchema.index({ createdBy: 1, type: 1, createdAt: -1 });

const ActivityLogModel = model<IActivityLog>("ActivityLog", activityLogSchema);

export default ActivityLogModel;
