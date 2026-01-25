import { HydratedDocument, model, Query, Schema } from "mongoose";
import { ServiceDuration, ServiceType } from "./service.enum";
import { IService } from "./service.interface";

// Get only numeric values from ServiceDuration enum
const durationValues = Object.values(ServiceDuration).filter(
  (val) => typeof val === "number",
);

const serviceSchema = new Schema<IService>(
  {
    serviceName: {
      type: String,
      required: true,
      trim: true,
    },
    duration: {
      type: Number,
      enum: durationValues,
      required: true,
    },
    requiredStaffType: {
      type: String,
      enum: Object.values(ServiceType),
      required: true,
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
serviceSchema.pre(
  /^find/,
  function (this: Query<HydratedDocument<IService>[], IService>, next) {
    this.where({ isDeleted: { $ne: true } });
    next();
  },
);

// Aggregate middleware to exclude soft deleted items
serviceSchema.pre("aggregate", function (next) {
  this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
  next();
});

// Indexes for better performance
serviceSchema.index({ createdBy: 1 });
serviceSchema.index({ requiredStaffType: 1 });
serviceSchema.index({ duration: 1 });
serviceSchema.index({ isDeleted: 1 });
serviceSchema.index({ serviceName: "text" });

// Compound index for common queries
serviceSchema.index({ createdBy: 1, requiredStaffType: 1 });

const ServiceModel = model<IService>("Service", serviceSchema);

export default ServiceModel;
