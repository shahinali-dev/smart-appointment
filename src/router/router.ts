import { Router } from "express";
import { appointmentRoute } from "../modules/appointment/appointment.controller";
import { authRoute } from "../modules/auth/auth.controller";
import { serviceRoute } from "../modules/service/service.controller";
import { staffRoute } from "../modules/staff/staff.controller";
import { userRoute } from "../modules/user/user.controller";

const router = Router();

const moduleRoutes = [
  {
    path: "/v1/auth",
    route: authRoute,
  },

  {
    path: "/v1/user",
    route: userRoute,
  },
  {
    path: "/v1/staff",
    route: staffRoute,
  },
  {
    path: "/v1/service",
    route: serviceRoute,
  },
  {
    path: "/v1/appointment",
    route: appointmentRoute,
  },
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
