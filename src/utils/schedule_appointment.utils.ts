import { appointmentQueue } from "../config/queue";

/**
 * Schedule appointment to be auto-completed after service duration
 * @param appointmentId - The appointment ID to schedule
 * @param appointmentDate - The appointment date
 * @param appointmentTime - The appointment time
 * @param serviceDuration - The service duration in minutes
 */
export async function scheduleAppointmentCompletion(
  appointmentId: string,
  appointmentDate: Date,
  appointmentTime: string,
  serviceDuration: number,
) {
  try {
    // Calculate when the appointment should be completed
    const [hours, minutes] = appointmentTime.split(":").map(Number);
    const appointmentStartTime = new Date(appointmentDate);
    appointmentStartTime.setHours(hours, minutes, 0, 0);

    // Add service duration to get completion time
    const completionTime = new Date(appointmentStartTime);
    completionTime.setMinutes(completionTime.getMinutes() + serviceDuration);

    // Calculate delay in milliseconds
    const delay = completionTime.getTime() - new Date().getTime();

    if (delay > 0) {
      // Schedule the job
      await appointmentQueue.add(
        "complete-appointment",
        { appointmentId },
        {
          delay,
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
        },
      );

      // eslint-disable-next-line no-console
      console.log(
        `Appointment ${appointmentId} scheduled to complete at ${completionTime.toISOString()}`,
      );
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(
      `Failed to schedule appointment completion for ${appointmentId}:`,
      error,
    );
    // Don't throw - this shouldn't break appointment creation
  }
}

/**
 * Remove a scheduled appointment completion job
 * @param appointmentId - The appointment ID
 */
export async function cancelAppointmentCompletion(appointmentId: string) {
  try {
    const jobs = await appointmentQueue.getJobs();
    const job = jobs.find((j) => j.data.appointmentId === appointmentId);

    if (job) {
      await job.remove();
      // eslint-disable-next-line no-console
      console.log(
        `Removed scheduled completion for appointment ${appointmentId}`,
      );
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(
      `Failed to cancel appointment completion for ${appointmentId}:`,
      error,
    );
  }
}
