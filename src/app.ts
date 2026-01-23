import cors from "cors";
import express, { Application, Request, Response } from "express";
import config from "./config";
import globalErrorHandler from "./middleware/global_error_handler.middleware";
import notFound from "./middleware/not_found.middleware";
import router from "./router/router";

const app: Application = express();

const allowedOrigins = config.CORS_ORIGIN?.split(",");
const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
};

app.use(express.json());
app.use(cors(corsOptions));
app.use(router);

app.get("/", (req: Request, res: Response) => {
  res.send("Welcome to Smart Appointment API");
});

app.use(notFound);
app.use(globalErrorHandler);

export default app;
