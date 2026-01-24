import { HydratedDocument, model, Query, Schema } from "mongoose";
import { AppointmentStatus } from "./appointment.enum";
import { IAppointment } from "./appointment.interface";

const appointmentSchema = new Schema<IAppointment>(
  {
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    service: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    assignedStaff: {
      type: Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
    },
    appointmentDate: {
      type: Date,
      required: true,
    },
    appointmentTime: {
      type: String,
      required: true,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    },
    status: {
      type: String,
      enum: Object.values(AppointmentStatus),
      default: AppointmentStatus.SCHEDULED,
    },
    queuePosition: {
      type: Number,
      default: null,
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
appointmentSchema.pre(
  /^find/,
  function (this: Query<HydratedDocument<IAppointment>[], IAppointment>, next) {
    this.where({ isDeleted: { $ne: true } });
    next();
  },
);

// Aggregate middleware to exclude soft deleted items
appointmentSchema.pre("aggregate", function (next) {
  this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
  next();
});

// Indexes for better performance
appointmentSchema.index({ createdBy: 1 });
appointmentSchema.index({ appointmentDate: 1 });
appointmentSchema.index({ assignedStaff: 1 });
appointmentSchema.index({ service: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ isDeleted: 1 });
appointmentSchema.index({ customerName: "text" });

// Compound indexes for common queries
appointmentSchema.index({ createdBy: 1, appointmentDate: 1 });
appointmentSchema.index({ createdBy: 1, status: 1 });
appointmentSchema.index({ assignedStaff: 1, appointmentDate: 1 });
appointmentSchema.index({ status: 1, queuePosition: 1 });

const AppointmentModel = model<IAppointment>("Appointment", appointmentSchema);

export default AppointmentModel;
