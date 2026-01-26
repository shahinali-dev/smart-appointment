import { Queue, Worker } from "bullmq";
import redis from "ioredis";
import { AppointmentStatus } from "../modules/appointment/appointment.enum";
import AppointmentModel from "../modules/appointment/appointment.model";

// Initialize Redis connection
export const redisConnection = new redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  maxRetriesPerRequest: null,
});

// Create appointment completion queue
export const appointmentQueue = new Queue("appointment-completion", {
  connection: redisConnection,
});

// Process appointment completion jobs
export const appointmentWorker = new Worker(
  "appointment-completion",
  async (job) => {
    try {
      const { appointmentId } = job.data;

      // Update appointment status to COMPLETED
      await AppointmentModel.findByIdAndUpdate(appointmentId, {
        status: AppointmentStatus.COMPLETED,
      });

      // eslint-disable-next-line no-console
      console.log(
        `Appointment ${appointmentId} marked as completed automatically`,
      );
      return { success: true, appointmentId };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(
        `Error completing appointment ${job.data.appointmentId}:`,
        error,
      );
      throw error;
    }
  },
  {
    connection: redisConnection,
  },
);

// Handle worker events
appointmentWorker.on("completed", (job) => {
  // eslint-disable-next-line no-console
  console.log(`Job ${job.id} completed successfully`);
});

appointmentWorker.on("failed", (job, err) => {
  // eslint-disable-next-line no-console
  console.error(`Job ${job?.id} failed:`, err.message);
});

export default appointmentQueue;
