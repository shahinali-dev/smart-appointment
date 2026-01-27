import mongoose from "mongoose";
import app from "./app";
import config from "./config";

async function main() {
  try {
    await mongoose.connect(config.DB as string);

    app.listen(config.PORT, () => {
      console.log(`Smart Appointment app is listening on port ${config.PORT}`);
    });
  } catch (error) {
    console.log(error);
  }
}

main();
