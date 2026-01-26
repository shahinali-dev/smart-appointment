import mongoose from "mongoose";
import app from "./app";
import config from "./config";
import { appointmentWorker } from "./config/queue";

async function main() {
  try {
    await mongoose.connect(config.DB as string);

    app.listen(config.PORT, () => {
      console.log(`Smart Appointment app is listening on port ${config.PORT}`);
      console.log("Appointment completion job queue initialized");
    });
  } catch (error) {
    console.log(error);
  }
}

// Gracefully shutdown worker on process termination
process.on("SIGINT", async () => {
  console.log("Shutting down appointment worker...");
  await appointmentWorker.close();
  process.exit(0);
});

main();
