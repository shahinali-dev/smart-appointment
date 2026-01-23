import { HydratedDocument, model, Query, Schema } from "mongoose";
import { AvailabilityStatus, ServiceType } from "./staff.enum";
import { IStaff } from "./staff.interface";

const staffSchema = new Schema<IStaff>(
  {
    name: {
      type: String,
      required: true,
    },
    serviceType: {
      type: String,
      enum: Object.values(ServiceType),
      required: true,
    },
    dailyCapacity: {
      type: Number,
      default: 5,
      min: 1,
      max: 10,
    },
    availabilityStatus: {
      type: String,
      enum: Object.values(AvailabilityStatus),
      default: AvailabilityStatus.AVAILABLE,
    },
    createdBy: {
      type: String,
      required: true,
      ref: "User",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Query middleware to exclude soft deleted items
staffSchema.pre(
  /^find/,
  function (this: Query<HydratedDocument<IStaff>[], IStaff>, next) {
    this.where({ isDeleted: { $ne: true } });
    next();
  },
);

// Aggregate middleware to exclude soft deleted items
staffSchema.pre("aggregate", function (next) {
  this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
  next();
});

// Indexes for better performance
staffSchema.index({ createdBy: 1 });
staffSchema.index({ serviceType: 1 });
staffSchema.index({ availabilityStatus: 1 });
staffSchema.index({ isDeleted: 1 });
staffSchema.index({ name: "text" });

const StaffModel = model<IStaff>("Staff", staffSchema);

export default StaffModel;
