import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import studentsRouter from "./students";
import examsRouter from "./exams";
import questionsRouter from "./questions";
import examSessionsRouter from "./exam-sessions";
import resultsRouter from "./results";
import attendanceRouter from "./attendance";
import admitCardsRouter from "./admit-cards";
import dashboardRouter from "./dashboard";
import notificationsRouter from "./notifications";
import adminRouter from "./admin";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(studentsRouter);
router.use(examsRouter);
router.use(questionsRouter);
router.use(examSessionsRouter);
router.use(resultsRouter);
router.use(attendanceRouter);
router.use(admitCardsRouter);
router.use(dashboardRouter);
router.use(notificationsRouter);
router.use(adminRouter);
router.use(aiRouter);

export default router;
