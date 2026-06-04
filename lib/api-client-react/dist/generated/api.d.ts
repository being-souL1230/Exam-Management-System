import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import type { AdminDashboard, AdmitCard, AssignQuestionsBody, AttendanceRecord, AuthResponse, AutoGenerateBody, CreateExamBody, CreateQuestionBody, CreateStudentBody, Exam, ExamDetail, ExamListResponse, ExamQuestion, ExamSession, ExamSessionQuestion, GetSubjectPerformanceParams, GradeSubjectiveBody, HealthStatus, ListExamsParams, ListQuestionsParams, ListStudentsParams, LogIncidentBody, LoginBody, MarkAttendanceBody, Notification, Question, QuestionListResponse, RegisterBody, Result, SaveAnswerBody, SavedAnswer, Student, StudentDashboard, StudentDetail, StudentListResponse, SubjectPerformance, TeacherDashboard, UpdateExamBody, UpdateQuestionBody, UpdateStudentBody, UserWithStudent, VerifyQrBody } from "./api.schemas";
import { customFetch } from "../custom-fetch";
import type { ErrorType, BodyType } from "../custom-fetch";
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
/**
 * @summary Health check
 */
export declare const getHealthCheckUrl: () => string;
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Register a new user
 */
export declare const getRegisterUrl: () => string;
export declare const register: (registerBody: RegisterBody, options?: RequestInit) => Promise<AuthResponse>;
export declare const getRegisterMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof register>>, TError, {
        data: BodyType<RegisterBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof register>>, TError, {
    data: BodyType<RegisterBody>;
}, TContext>;
export type RegisterMutationResult = NonNullable<Awaited<ReturnType<typeof register>>>;
export type RegisterMutationBody = BodyType<RegisterBody>;
export type RegisterMutationError = ErrorType<void>;
/**
 * @summary Register a new user
 */
export declare const useRegister: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof register>>, TError, {
        data: BodyType<RegisterBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof register>>, TError, {
    data: BodyType<RegisterBody>;
}, TContext>;
/**
 * @summary Login
 */
export declare const getLoginUrl: () => string;
export declare const login: (loginBody: LoginBody, options?: RequestInit) => Promise<AuthResponse>;
export declare const getLoginMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof login>>, TError, {
        data: BodyType<LoginBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof login>>, TError, {
    data: BodyType<LoginBody>;
}, TContext>;
export type LoginMutationResult = NonNullable<Awaited<ReturnType<typeof login>>>;
export type LoginMutationBody = BodyType<LoginBody>;
export type LoginMutationError = ErrorType<void>;
/**
 * @summary Login
 */
export declare const useLogin: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof login>>, TError, {
        data: BodyType<LoginBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof login>>, TError, {
    data: BodyType<LoginBody>;
}, TContext>;
/**
 * @summary Get current user
 */
export declare const getGetMeUrl: () => string;
export declare const getMe: (options?: RequestInit) => Promise<UserWithStudent>;
export declare const getGetMeQueryKey: () => readonly ["/api/auth/me"];
export declare const getGetMeQueryOptions: <TData = Awaited<ReturnType<typeof getMe>>, TError = ErrorType<void>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMe>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMe>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMeQueryResult = NonNullable<Awaited<ReturnType<typeof getMe>>>;
export type GetMeQueryError = ErrorType<void>;
/**
 * @summary Get current user
 */
export declare function useGetMe<TData = Awaited<ReturnType<typeof getMe>>, TError = ErrorType<void>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMe>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Logout
 */
export declare const getLogoutUrl: () => string;
export declare const logout: (options?: RequestInit) => Promise<void>;
export declare const getLogoutMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof logout>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof logout>>, TError, void, TContext>;
export type LogoutMutationResult = NonNullable<Awaited<ReturnType<typeof logout>>>;
export type LogoutMutationError = ErrorType<unknown>;
/**
 * @summary Logout
 */
export declare const useLogout: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof logout>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof logout>>, TError, void, TContext>;
/**
 * @summary List students
 */
export declare const getListStudentsUrl: (params?: ListStudentsParams) => string;
export declare const listStudents: (params?: ListStudentsParams, options?: RequestInit) => Promise<StudentListResponse>;
export declare const getListStudentsQueryKey: (params?: ListStudentsParams) => readonly ["/api/students", ...ListStudentsParams[]];
export declare const getListStudentsQueryOptions: <TData = Awaited<ReturnType<typeof listStudents>>, TError = ErrorType<unknown>>(params?: ListStudentsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listStudents>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listStudents>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListStudentsQueryResult = NonNullable<Awaited<ReturnType<typeof listStudents>>>;
export type ListStudentsQueryError = ErrorType<unknown>;
/**
 * @summary List students
 */
export declare function useListStudents<TData = Awaited<ReturnType<typeof listStudents>>, TError = ErrorType<unknown>>(params?: ListStudentsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listStudents>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a student
 */
export declare const getCreateStudentUrl: () => string;
export declare const createStudent: (createStudentBody: CreateStudentBody, options?: RequestInit) => Promise<Student>;
export declare const getCreateStudentMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createStudent>>, TError, {
        data: BodyType<CreateStudentBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createStudent>>, TError, {
    data: BodyType<CreateStudentBody>;
}, TContext>;
export type CreateStudentMutationResult = NonNullable<Awaited<ReturnType<typeof createStudent>>>;
export type CreateStudentMutationBody = BodyType<CreateStudentBody>;
export type CreateStudentMutationError = ErrorType<unknown>;
/**
 * @summary Create a student
 */
export declare const useCreateStudent: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createStudent>>, TError, {
        data: BodyType<CreateStudentBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createStudent>>, TError, {
    data: BodyType<CreateStudentBody>;
}, TContext>;
/**
 * @summary Get student by ID
 */
export declare const getGetStudentUrl: (id: number) => string;
export declare const getStudent: (id: number, options?: RequestInit) => Promise<StudentDetail>;
export declare const getGetStudentQueryKey: (id: number) => readonly [`/api/students/${number}`];
export declare const getGetStudentQueryOptions: <TData = Awaited<ReturnType<typeof getStudent>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getStudent>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getStudent>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetStudentQueryResult = NonNullable<Awaited<ReturnType<typeof getStudent>>>;
export type GetStudentQueryError = ErrorType<void>;
/**
 * @summary Get student by ID
 */
export declare function useGetStudent<TData = Awaited<ReturnType<typeof getStudent>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getStudent>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update student
 */
export declare const getUpdateStudentUrl: (id: number) => string;
export declare const updateStudent: (id: number, updateStudentBody: UpdateStudentBody, options?: RequestInit) => Promise<Student>;
export declare const getUpdateStudentMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateStudent>>, TError, {
        id: number;
        data: BodyType<UpdateStudentBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateStudent>>, TError, {
    id: number;
    data: BodyType<UpdateStudentBody>;
}, TContext>;
export type UpdateStudentMutationResult = NonNullable<Awaited<ReturnType<typeof updateStudent>>>;
export type UpdateStudentMutationBody = BodyType<UpdateStudentBody>;
export type UpdateStudentMutationError = ErrorType<unknown>;
/**
 * @summary Update student
 */
export declare const useUpdateStudent: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateStudent>>, TError, {
        id: number;
        data: BodyType<UpdateStudentBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateStudent>>, TError, {
    id: number;
    data: BodyType<UpdateStudentBody>;
}, TContext>;
/**
 * @summary Delete student
 */
export declare const getDeleteStudentUrl: (id: number) => string;
export declare const deleteStudent: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteStudentMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteStudent>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteStudent>>, TError, {
    id: number;
}, TContext>;
export type DeleteStudentMutationResult = NonNullable<Awaited<ReturnType<typeof deleteStudent>>>;
export type DeleteStudentMutationError = ErrorType<unknown>;
/**
 * @summary Delete student
 */
export declare const useDeleteStudent: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteStudent>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteStudent>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary List exams
 */
export declare const getListExamsUrl: (params?: ListExamsParams) => string;
export declare const listExams: (params?: ListExamsParams, options?: RequestInit) => Promise<ExamListResponse>;
export declare const getListExamsQueryKey: (params?: ListExamsParams) => readonly ["/api/exams", ...ListExamsParams[]];
export declare const getListExamsQueryOptions: <TData = Awaited<ReturnType<typeof listExams>>, TError = ErrorType<unknown>>(params?: ListExamsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listExams>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listExams>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListExamsQueryResult = NonNullable<Awaited<ReturnType<typeof listExams>>>;
export type ListExamsQueryError = ErrorType<unknown>;
/**
 * @summary List exams
 */
export declare function useListExams<TData = Awaited<ReturnType<typeof listExams>>, TError = ErrorType<unknown>>(params?: ListExamsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listExams>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create exam
 */
export declare const getCreateExamUrl: () => string;
export declare const createExam: (createExamBody: CreateExamBody, options?: RequestInit) => Promise<Exam>;
export declare const getCreateExamMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createExam>>, TError, {
        data: BodyType<CreateExamBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createExam>>, TError, {
    data: BodyType<CreateExamBody>;
}, TContext>;
export type CreateExamMutationResult = NonNullable<Awaited<ReturnType<typeof createExam>>>;
export type CreateExamMutationBody = BodyType<CreateExamBody>;
export type CreateExamMutationError = ErrorType<unknown>;
/**
 * @summary Create exam
 */
export declare const useCreateExam: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createExam>>, TError, {
        data: BodyType<CreateExamBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createExam>>, TError, {
    data: BodyType<CreateExamBody>;
}, TContext>;
/**
 * @summary Get exam details
 */
export declare const getGetExamUrl: (id: number) => string;
export declare const getExam: (id: number, options?: RequestInit) => Promise<ExamDetail>;
export declare const getGetExamQueryKey: (id: number) => readonly [`/api/exams/${number}`];
export declare const getGetExamQueryOptions: <TData = Awaited<ReturnType<typeof getExam>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getExam>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getExam>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetExamQueryResult = NonNullable<Awaited<ReturnType<typeof getExam>>>;
export type GetExamQueryError = ErrorType<unknown>;
/**
 * @summary Get exam details
 */
export declare function useGetExam<TData = Awaited<ReturnType<typeof getExam>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getExam>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update exam
 */
export declare const getUpdateExamUrl: (id: number) => string;
export declare const updateExam: (id: number, updateExamBody: UpdateExamBody, options?: RequestInit) => Promise<Exam>;
export declare const getUpdateExamMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateExam>>, TError, {
        id: number;
        data: BodyType<UpdateExamBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateExam>>, TError, {
    id: number;
    data: BodyType<UpdateExamBody>;
}, TContext>;
export type UpdateExamMutationResult = NonNullable<Awaited<ReturnType<typeof updateExam>>>;
export type UpdateExamMutationBody = BodyType<UpdateExamBody>;
export type UpdateExamMutationError = ErrorType<unknown>;
/**
 * @summary Update exam
 */
export declare const useUpdateExam: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateExam>>, TError, {
        id: number;
        data: BodyType<UpdateExamBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateExam>>, TError, {
    id: number;
    data: BodyType<UpdateExamBody>;
}, TContext>;
/**
 * @summary Delete exam
 */
export declare const getDeleteExamUrl: (id: number) => string;
export declare const deleteExam: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteExamMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteExam>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteExam>>, TError, {
    id: number;
}, TContext>;
export type DeleteExamMutationResult = NonNullable<Awaited<ReturnType<typeof deleteExam>>>;
export type DeleteExamMutationError = ErrorType<unknown>;
/**
 * @summary Delete exam
 */
export declare const useDeleteExam: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteExam>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteExam>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Get questions assigned to an exam
 */
export declare const getGetExamQuestionsUrl: (id: number) => string;
export declare const getExamQuestions: (id: number, options?: RequestInit) => Promise<ExamQuestion[]>;
export declare const getGetExamQuestionsQueryKey: (id: number) => readonly [`/api/exams/${number}/questions`];
export declare const getGetExamQuestionsQueryOptions: <TData = Awaited<ReturnType<typeof getExamQuestions>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getExamQuestions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getExamQuestions>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetExamQuestionsQueryResult = NonNullable<Awaited<ReturnType<typeof getExamQuestions>>>;
export type GetExamQuestionsQueryError = ErrorType<unknown>;
/**
 * @summary Get questions assigned to an exam
 */
export declare function useGetExamQuestions<TData = Awaited<ReturnType<typeof getExamQuestions>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getExamQuestions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Assign questions to exam
 */
export declare const getAssignQuestionsToExamUrl: (id: number) => string;
export declare const assignQuestionsToExam: (id: number, assignQuestionsBody: AssignQuestionsBody, options?: RequestInit) => Promise<ExamQuestion[]>;
export declare const getAssignQuestionsToExamMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof assignQuestionsToExam>>, TError, {
        id: number;
        data: BodyType<AssignQuestionsBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof assignQuestionsToExam>>, TError, {
    id: number;
    data: BodyType<AssignQuestionsBody>;
}, TContext>;
export type AssignQuestionsToExamMutationResult = NonNullable<Awaited<ReturnType<typeof assignQuestionsToExam>>>;
export type AssignQuestionsToExamMutationBody = BodyType<AssignQuestionsBody>;
export type AssignQuestionsToExamMutationError = ErrorType<unknown>;
/**
 * @summary Assign questions to exam
 */
export declare const useAssignQuestionsToExam: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof assignQuestionsToExam>>, TError, {
        id: number;
        data: BodyType<AssignQuestionsBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof assignQuestionsToExam>>, TError, {
    id: number;
    data: BodyType<AssignQuestionsBody>;
}, TContext>;
/**
 * @summary Auto-generate question paper from question bank
 */
export declare const getAutoGenerateQuestionPaperUrl: (id: number) => string;
export declare const autoGenerateQuestionPaper: (id: number, autoGenerateBody: AutoGenerateBody, options?: RequestInit) => Promise<ExamQuestion[]>;
export declare const getAutoGenerateQuestionPaperMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof autoGenerateQuestionPaper>>, TError, {
        id: number;
        data: BodyType<AutoGenerateBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof autoGenerateQuestionPaper>>, TError, {
    id: number;
    data: BodyType<AutoGenerateBody>;
}, TContext>;
export type AutoGenerateQuestionPaperMutationResult = NonNullable<Awaited<ReturnType<typeof autoGenerateQuestionPaper>>>;
export type AutoGenerateQuestionPaperMutationBody = BodyType<AutoGenerateBody>;
export type AutoGenerateQuestionPaperMutationError = ErrorType<unknown>;
/**
 * @summary Auto-generate question paper from question bank
 */
export declare const useAutoGenerateQuestionPaper: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof autoGenerateQuestionPaper>>, TError, {
        id: number;
        data: BodyType<AutoGenerateBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof autoGenerateQuestionPaper>>, TError, {
    id: number;
    data: BodyType<AutoGenerateBody>;
}, TContext>;
/**
 * @summary Get students eligible for exam
 */
export declare const getGetEligibleStudentsUrl: (id: number) => string;
export declare const getEligibleStudents: (id: number, options?: RequestInit) => Promise<Student[]>;
export declare const getGetEligibleStudentsQueryKey: (id: number) => readonly [`/api/exams/${number}/eligible-students`];
export declare const getGetEligibleStudentsQueryOptions: <TData = Awaited<ReturnType<typeof getEligibleStudents>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getEligibleStudents>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getEligibleStudents>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetEligibleStudentsQueryResult = NonNullable<Awaited<ReturnType<typeof getEligibleStudents>>>;
export type GetEligibleStudentsQueryError = ErrorType<unknown>;
/**
 * @summary Get students eligible for exam
 */
export declare function useGetEligibleStudents<TData = Awaited<ReturnType<typeof getEligibleStudents>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getEligibleStudents>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary List questions
 */
export declare const getListQuestionsUrl: (params?: ListQuestionsParams) => string;
export declare const listQuestions: (params?: ListQuestionsParams, options?: RequestInit) => Promise<QuestionListResponse>;
export declare const getListQuestionsQueryKey: (params?: ListQuestionsParams) => readonly ["/api/questions", ...ListQuestionsParams[]];
export declare const getListQuestionsQueryOptions: <TData = Awaited<ReturnType<typeof listQuestions>>, TError = ErrorType<unknown>>(params?: ListQuestionsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listQuestions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listQuestions>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListQuestionsQueryResult = NonNullable<Awaited<ReturnType<typeof listQuestions>>>;
export type ListQuestionsQueryError = ErrorType<unknown>;
/**
 * @summary List questions
 */
export declare function useListQuestions<TData = Awaited<ReturnType<typeof listQuestions>>, TError = ErrorType<unknown>>(params?: ListQuestionsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listQuestions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create question
 */
export declare const getCreateQuestionUrl: () => string;
export declare const createQuestion: (createQuestionBody: CreateQuestionBody, options?: RequestInit) => Promise<Question>;
export declare const getCreateQuestionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createQuestion>>, TError, {
        data: BodyType<CreateQuestionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createQuestion>>, TError, {
    data: BodyType<CreateQuestionBody>;
}, TContext>;
export type CreateQuestionMutationResult = NonNullable<Awaited<ReturnType<typeof createQuestion>>>;
export type CreateQuestionMutationBody = BodyType<CreateQuestionBody>;
export type CreateQuestionMutationError = ErrorType<unknown>;
/**
 * @summary Create question
 */
export declare const useCreateQuestion: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createQuestion>>, TError, {
        data: BodyType<CreateQuestionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createQuestion>>, TError, {
    data: BodyType<CreateQuestionBody>;
}, TContext>;
/**
 * @summary Get question by ID
 */
export declare const getGetQuestionUrl: (id: number) => string;
export declare const getQuestion: (id: number, options?: RequestInit) => Promise<Question>;
export declare const getGetQuestionQueryKey: (id: number) => readonly [`/api/questions/${number}`];
export declare const getGetQuestionQueryOptions: <TData = Awaited<ReturnType<typeof getQuestion>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getQuestion>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getQuestion>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetQuestionQueryResult = NonNullable<Awaited<ReturnType<typeof getQuestion>>>;
export type GetQuestionQueryError = ErrorType<unknown>;
/**
 * @summary Get question by ID
 */
export declare function useGetQuestion<TData = Awaited<ReturnType<typeof getQuestion>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getQuestion>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update question
 */
export declare const getUpdateQuestionUrl: (id: number) => string;
export declare const updateQuestion: (id: number, updateQuestionBody: UpdateQuestionBody, options?: RequestInit) => Promise<Question>;
export declare const getUpdateQuestionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateQuestion>>, TError, {
        id: number;
        data: BodyType<UpdateQuestionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateQuestion>>, TError, {
    id: number;
    data: BodyType<UpdateQuestionBody>;
}, TContext>;
export type UpdateQuestionMutationResult = NonNullable<Awaited<ReturnType<typeof updateQuestion>>>;
export type UpdateQuestionMutationBody = BodyType<UpdateQuestionBody>;
export type UpdateQuestionMutationError = ErrorType<unknown>;
/**
 * @summary Update question
 */
export declare const useUpdateQuestion: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateQuestion>>, TError, {
        id: number;
        data: BodyType<UpdateQuestionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateQuestion>>, TError, {
    id: number;
    data: BodyType<UpdateQuestionBody>;
}, TContext>;
/**
 * @summary Delete question
 */
export declare const getDeleteQuestionUrl: (id: number) => string;
export declare const deleteQuestion: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteQuestionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteQuestion>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteQuestion>>, TError, {
    id: number;
}, TContext>;
export type DeleteQuestionMutationResult = NonNullable<Awaited<ReturnType<typeof deleteQuestion>>>;
export type DeleteQuestionMutationError = ErrorType<unknown>;
/**
 * @summary Delete question
 */
export declare const useDeleteQuestion: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteQuestion>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteQuestion>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Start an exam session
 */
export declare const getStartExamUrl: (examId: number) => string;
export declare const startExam: (examId: number, options?: RequestInit) => Promise<ExamSession>;
export declare const getStartExamMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof startExam>>, TError, {
        examId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof startExam>>, TError, {
    examId: number;
}, TContext>;
export type StartExamMutationResult = NonNullable<Awaited<ReturnType<typeof startExam>>>;
export type StartExamMutationError = ErrorType<unknown>;
/**
 * @summary Start an exam session
 */
export declare const useStartExam: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof startExam>>, TError, {
        examId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof startExam>>, TError, {
    examId: number;
}, TContext>;
/**
 * @summary Get questions for active exam session
 */
export declare const getGetExamSessionQuestionsUrl: (examId: number) => string;
export declare const getExamSessionQuestions: (examId: number, options?: RequestInit) => Promise<ExamSessionQuestion[]>;
export declare const getGetExamSessionQuestionsQueryKey: (examId: number) => readonly [`/api/exam-sessions/${number}/questions`];
export declare const getGetExamSessionQuestionsQueryOptions: <TData = Awaited<ReturnType<typeof getExamSessionQuestions>>, TError = ErrorType<unknown>>(examId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getExamSessionQuestions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getExamSessionQuestions>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetExamSessionQuestionsQueryResult = NonNullable<Awaited<ReturnType<typeof getExamSessionQuestions>>>;
export type GetExamSessionQuestionsQueryError = ErrorType<unknown>;
/**
 * @summary Get questions for active exam session
 */
export declare function useGetExamSessionQuestions<TData = Awaited<ReturnType<typeof getExamSessionQuestions>>, TError = ErrorType<unknown>>(examId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getExamSessionQuestions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Save answer for a question
 */
export declare const getSaveAnswerUrl: (examId: number) => string;
export declare const saveAnswer: (examId: number, saveAnswerBody: SaveAnswerBody, options?: RequestInit) => Promise<SavedAnswer>;
export declare const getSaveAnswerMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof saveAnswer>>, TError, {
        examId: number;
        data: BodyType<SaveAnswerBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof saveAnswer>>, TError, {
    examId: number;
    data: BodyType<SaveAnswerBody>;
}, TContext>;
export type SaveAnswerMutationResult = NonNullable<Awaited<ReturnType<typeof saveAnswer>>>;
export type SaveAnswerMutationBody = BodyType<SaveAnswerBody>;
export type SaveAnswerMutationError = ErrorType<unknown>;
/**
 * @summary Save answer for a question
 */
export declare const useSaveAnswer: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof saveAnswer>>, TError, {
        examId: number;
        data: BodyType<SaveAnswerBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof saveAnswer>>, TError, {
    examId: number;
    data: BodyType<SaveAnswerBody>;
}, TContext>;
/**
 * @summary Submit exam
 */
export declare const getSubmitExamUrl: (examId: number) => string;
export declare const submitExam: (examId: number, options?: RequestInit) => Promise<ExamSession>;
export declare const getSubmitExamMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof submitExam>>, TError, {
        examId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof submitExam>>, TError, {
    examId: number;
}, TContext>;
export type SubmitExamMutationResult = NonNullable<Awaited<ReturnType<typeof submitExam>>>;
export type SubmitExamMutationError = ErrorType<unknown>;
/**
 * @summary Submit exam
 */
export declare const useSubmitExam: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof submitExam>>, TError, {
        examId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof submitExam>>, TError, {
    examId: number;
}, TContext>;
/**
 * @summary Get exam session status
 */
export declare const getGetExamSessionStatusUrl: (examId: number) => string;
export declare const getExamSessionStatus: (examId: number, options?: RequestInit) => Promise<ExamSession>;
export declare const getGetExamSessionStatusQueryKey: (examId: number) => readonly [`/api/exam-sessions/${number}/status`];
export declare const getGetExamSessionStatusQueryOptions: <TData = Awaited<ReturnType<typeof getExamSessionStatus>>, TError = ErrorType<unknown>>(examId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getExamSessionStatus>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getExamSessionStatus>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetExamSessionStatusQueryResult = NonNullable<Awaited<ReturnType<typeof getExamSessionStatus>>>;
export type GetExamSessionStatusQueryError = ErrorType<unknown>;
/**
 * @summary Get exam session status
 */
export declare function useGetExamSessionStatus<TData = Awaited<ReturnType<typeof getExamSessionStatus>>, TError = ErrorType<unknown>>(examId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getExamSessionStatus>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Log anti-cheat incident
 */
export declare const getLogIncidentUrl: (examId: number) => string;
export declare const logIncident: (examId: number, logIncidentBody: LogIncidentBody, options?: RequestInit) => Promise<void>;
export declare const getLogIncidentMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof logIncident>>, TError, {
        examId: number;
        data: BodyType<LogIncidentBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof logIncident>>, TError, {
    examId: number;
    data: BodyType<LogIncidentBody>;
}, TContext>;
export type LogIncidentMutationResult = NonNullable<Awaited<ReturnType<typeof logIncident>>>;
export type LogIncidentMutationBody = BodyType<LogIncidentBody>;
export type LogIncidentMutationError = ErrorType<unknown>;
/**
 * @summary Log anti-cheat incident
 */
export declare const useLogIncident: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof logIncident>>, TError, {
        examId: number;
        data: BodyType<LogIncidentBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof logIncident>>, TError, {
    examId: number;
    data: BodyType<LogIncidentBody>;
}, TContext>;
/**
 * @summary Get results for an exam
 */
export declare const getGetExamResultsUrl: (examId: number) => string;
export declare const getExamResults: (examId: number, options?: RequestInit) => Promise<Result[]>;
export declare const getGetExamResultsQueryKey: (examId: number) => readonly [`/api/results/exam/${number}`];
export declare const getGetExamResultsQueryOptions: <TData = Awaited<ReturnType<typeof getExamResults>>, TError = ErrorType<unknown>>(examId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getExamResults>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getExamResults>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetExamResultsQueryResult = NonNullable<Awaited<ReturnType<typeof getExamResults>>>;
export type GetExamResultsQueryError = ErrorType<unknown>;
/**
 * @summary Get results for an exam
 */
export declare function useGetExamResults<TData = Awaited<ReturnType<typeof getExamResults>>, TError = ErrorType<unknown>>(examId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getExamResults>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Calculate and generate results for an exam
 */
export declare const getCalculateResultsUrl: (examId: number) => string;
export declare const calculateResults: (examId: number, options?: RequestInit) => Promise<Result[]>;
export declare const getCalculateResultsMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof calculateResults>>, TError, {
        examId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof calculateResults>>, TError, {
    examId: number;
}, TContext>;
export type CalculateResultsMutationResult = NonNullable<Awaited<ReturnType<typeof calculateResults>>>;
export type CalculateResultsMutationError = ErrorType<unknown>;
/**
 * @summary Calculate and generate results for an exam
 */
export declare const useCalculateResults: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof calculateResults>>, TError, {
        examId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof calculateResults>>, TError, {
    examId: number;
}, TContext>;
/**
 * @summary Publish results for students
 */
export declare const getPublishResultsUrl: (examId: number) => string;
export declare const publishResults: (examId: number, options?: RequestInit) => Promise<void>;
export declare const getPublishResultsMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof publishResults>>, TError, {
        examId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof publishResults>>, TError, {
    examId: number;
}, TContext>;
export type PublishResultsMutationResult = NonNullable<Awaited<ReturnType<typeof publishResults>>>;
export type PublishResultsMutationError = ErrorType<unknown>;
/**
 * @summary Publish results for students
 */
export declare const usePublishResults: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof publishResults>>, TError, {
        examId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof publishResults>>, TError, {
    examId: number;
}, TContext>;
/**
 * @summary Get all results for a student
 */
export declare const getGetStudentResultsUrl: (studentId: number) => string;
export declare const getStudentResults: (studentId: number, options?: RequestInit) => Promise<Result[]>;
export declare const getGetStudentResultsQueryKey: (studentId: number) => readonly [`/api/results/student/${number}`];
export declare const getGetStudentResultsQueryOptions: <TData = Awaited<ReturnType<typeof getStudentResults>>, TError = ErrorType<unknown>>(studentId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getStudentResults>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getStudentResults>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetStudentResultsQueryResult = NonNullable<Awaited<ReturnType<typeof getStudentResults>>>;
export type GetStudentResultsQueryError = ErrorType<unknown>;
/**
 * @summary Get all results for a student
 */
export declare function useGetStudentResults<TData = Awaited<ReturnType<typeof getStudentResults>>, TError = ErrorType<unknown>>(studentId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getStudentResults>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Grade subjective answers
 */
export declare const getGradeSubjectiveUrl: (resultId: number) => string;
export declare const gradeSubjective: (resultId: number, gradeSubjectiveBody: GradeSubjectiveBody, options?: RequestInit) => Promise<Result>;
export declare const getGradeSubjectiveMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof gradeSubjective>>, TError, {
        resultId: number;
        data: BodyType<GradeSubjectiveBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof gradeSubjective>>, TError, {
    resultId: number;
    data: BodyType<GradeSubjectiveBody>;
}, TContext>;
export type GradeSubjectiveMutationResult = NonNullable<Awaited<ReturnType<typeof gradeSubjective>>>;
export type GradeSubjectiveMutationBody = BodyType<GradeSubjectiveBody>;
export type GradeSubjectiveMutationError = ErrorType<unknown>;
/**
 * @summary Grade subjective answers
 */
export declare const useGradeSubjective: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof gradeSubjective>>, TError, {
        resultId: number;
        data: BodyType<GradeSubjectiveBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof gradeSubjective>>, TError, {
    resultId: number;
    data: BodyType<GradeSubjectiveBody>;
}, TContext>;
/**
 * @summary Get attendance for an exam
 */
export declare const getGetExamAttendanceUrl: (examId: number) => string;
export declare const getExamAttendance: (examId: number, options?: RequestInit) => Promise<AttendanceRecord[]>;
export declare const getGetExamAttendanceQueryKey: (examId: number) => readonly [`/api/attendance/exam/${number}`];
export declare const getGetExamAttendanceQueryOptions: <TData = Awaited<ReturnType<typeof getExamAttendance>>, TError = ErrorType<unknown>>(examId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getExamAttendance>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getExamAttendance>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetExamAttendanceQueryResult = NonNullable<Awaited<ReturnType<typeof getExamAttendance>>>;
export type GetExamAttendanceQueryError = ErrorType<unknown>;
/**
 * @summary Get attendance for an exam
 */
export declare function useGetExamAttendance<TData = Awaited<ReturnType<typeof getExamAttendance>>, TError = ErrorType<unknown>>(examId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getExamAttendance>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Mark attendance
 */
export declare const getMarkAttendanceUrl: () => string;
export declare const markAttendance: (markAttendanceBody: MarkAttendanceBody, options?: RequestInit) => Promise<AttendanceRecord>;
export declare const getMarkAttendanceMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof markAttendance>>, TError, {
        data: BodyType<MarkAttendanceBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof markAttendance>>, TError, {
    data: BodyType<MarkAttendanceBody>;
}, TContext>;
export type MarkAttendanceMutationResult = NonNullable<Awaited<ReturnType<typeof markAttendance>>>;
export type MarkAttendanceMutationBody = BodyType<MarkAttendanceBody>;
export type MarkAttendanceMutationError = ErrorType<unknown>;
/**
 * @summary Mark attendance
 */
export declare const useMarkAttendance: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof markAttendance>>, TError, {
        data: BodyType<MarkAttendanceBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof markAttendance>>, TError, {
    data: BodyType<MarkAttendanceBody>;
}, TContext>;
/**
 * @summary Verify QR code and mark attendance
 */
export declare const getVerifyQrAttendanceUrl: () => string;
export declare const verifyQrAttendance: (verifyQrBody: VerifyQrBody, options?: RequestInit) => Promise<AttendanceRecord>;
export declare const getVerifyQrAttendanceMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof verifyQrAttendance>>, TError, {
        data: BodyType<VerifyQrBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof verifyQrAttendance>>, TError, {
    data: BodyType<VerifyQrBody>;
}, TContext>;
export type VerifyQrAttendanceMutationResult = NonNullable<Awaited<ReturnType<typeof verifyQrAttendance>>>;
export type VerifyQrAttendanceMutationBody = BodyType<VerifyQrBody>;
export type VerifyQrAttendanceMutationError = ErrorType<unknown>;
/**
 * @summary Verify QR code and mark attendance
 */
export declare const useVerifyQrAttendance: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof verifyQrAttendance>>, TError, {
        data: BodyType<VerifyQrBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof verifyQrAttendance>>, TError, {
    data: BodyType<VerifyQrBody>;
}, TContext>;
/**
 * @summary Get admit cards for an exam
 */
export declare const getGetExamAdmitCardsUrl: (examId: number) => string;
export declare const getExamAdmitCards: (examId: number, options?: RequestInit) => Promise<AdmitCard[]>;
export declare const getGetExamAdmitCardsQueryKey: (examId: number) => readonly [`/api/admit-cards/exam/${number}`];
export declare const getGetExamAdmitCardsQueryOptions: <TData = Awaited<ReturnType<typeof getExamAdmitCards>>, TError = ErrorType<unknown>>(examId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getExamAdmitCards>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getExamAdmitCards>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetExamAdmitCardsQueryResult = NonNullable<Awaited<ReturnType<typeof getExamAdmitCards>>>;
export type GetExamAdmitCardsQueryError = ErrorType<unknown>;
/**
 * @summary Get admit cards for an exam
 */
export declare function useGetExamAdmitCards<TData = Awaited<ReturnType<typeof getExamAdmitCards>>, TError = ErrorType<unknown>>(examId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getExamAdmitCards>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Bulk generate admit cards
 */
export declare const getGenerateAdmitCardsUrl: (examId: number) => string;
export declare const generateAdmitCards: (examId: number, options?: RequestInit) => Promise<AdmitCard[]>;
export declare const getGenerateAdmitCardsMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof generateAdmitCards>>, TError, {
        examId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof generateAdmitCards>>, TError, {
    examId: number;
}, TContext>;
export type GenerateAdmitCardsMutationResult = NonNullable<Awaited<ReturnType<typeof generateAdmitCards>>>;
export type GenerateAdmitCardsMutationError = ErrorType<unknown>;
/**
 * @summary Bulk generate admit cards
 */
export declare const useGenerateAdmitCards: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof generateAdmitCards>>, TError, {
        examId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof generateAdmitCards>>, TError, {
    examId: number;
}, TContext>;
/**
 * @summary Get single admit card
 */
export declare const getGetAdmitCardUrl: (id: number) => string;
export declare const getAdmitCard: (id: number, options?: RequestInit) => Promise<AdmitCard>;
export declare const getGetAdmitCardQueryKey: (id: number) => readonly [`/api/admit-cards/${number}`];
export declare const getGetAdmitCardQueryOptions: <TData = Awaited<ReturnType<typeof getAdmitCard>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAdmitCard>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAdmitCard>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAdmitCardQueryResult = NonNullable<Awaited<ReturnType<typeof getAdmitCard>>>;
export type GetAdmitCardQueryError = ErrorType<unknown>;
/**
 * @summary Get single admit card
 */
export declare function useGetAdmitCard<TData = Awaited<ReturnType<typeof getAdmitCard>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAdmitCard>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Admin dashboard stats
 */
export declare const getGetAdminDashboardUrl: () => string;
export declare const getAdminDashboard: (options?: RequestInit) => Promise<AdminDashboard>;
export declare const getGetAdminDashboardQueryKey: () => readonly ["/api/dashboard/admin"];
export declare const getGetAdminDashboardQueryOptions: <TData = Awaited<ReturnType<typeof getAdminDashboard>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAdminDashboard>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAdminDashboard>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAdminDashboardQueryResult = NonNullable<Awaited<ReturnType<typeof getAdminDashboard>>>;
export type GetAdminDashboardQueryError = ErrorType<unknown>;
/**
 * @summary Admin dashboard stats
 */
export declare function useGetAdminDashboard<TData = Awaited<ReturnType<typeof getAdminDashboard>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAdminDashboard>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Teacher dashboard stats
 */
export declare const getGetTeacherDashboardUrl: () => string;
export declare const getTeacherDashboard: (options?: RequestInit) => Promise<TeacherDashboard>;
export declare const getGetTeacherDashboardQueryKey: () => readonly ["/api/dashboard/teacher"];
export declare const getGetTeacherDashboardQueryOptions: <TData = Awaited<ReturnType<typeof getTeacherDashboard>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTeacherDashboard>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getTeacherDashboard>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetTeacherDashboardQueryResult = NonNullable<Awaited<ReturnType<typeof getTeacherDashboard>>>;
export type GetTeacherDashboardQueryError = ErrorType<unknown>;
/**
 * @summary Teacher dashboard stats
 */
export declare function useGetTeacherDashboard<TData = Awaited<ReturnType<typeof getTeacherDashboard>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTeacherDashboard>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Student dashboard stats
 */
export declare const getGetStudentDashboardUrl: () => string;
export declare const getStudentDashboard: (options?: RequestInit) => Promise<StudentDashboard>;
export declare const getGetStudentDashboardQueryKey: () => readonly ["/api/dashboard/student"];
export declare const getGetStudentDashboardQueryOptions: <TData = Awaited<ReturnType<typeof getStudentDashboard>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getStudentDashboard>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getStudentDashboard>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetStudentDashboardQueryResult = NonNullable<Awaited<ReturnType<typeof getStudentDashboard>>>;
export type GetStudentDashboardQueryError = ErrorType<unknown>;
/**
 * @summary Student dashboard stats
 */
export declare function useGetStudentDashboard<TData = Awaited<ReturnType<typeof getStudentDashboard>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getStudentDashboard>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Subject-wise performance analytics
 */
export declare const getGetSubjectPerformanceUrl: (params?: GetSubjectPerformanceParams) => string;
export declare const getSubjectPerformance: (params?: GetSubjectPerformanceParams, options?: RequestInit) => Promise<SubjectPerformance[]>;
export declare const getGetSubjectPerformanceQueryKey: (params?: GetSubjectPerformanceParams) => readonly ["/api/dashboard/subject-performance", ...GetSubjectPerformanceParams[]];
export declare const getGetSubjectPerformanceQueryOptions: <TData = Awaited<ReturnType<typeof getSubjectPerformance>>, TError = ErrorType<unknown>>(params?: GetSubjectPerformanceParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSubjectPerformance>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getSubjectPerformance>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetSubjectPerformanceQueryResult = NonNullable<Awaited<ReturnType<typeof getSubjectPerformance>>>;
export type GetSubjectPerformanceQueryError = ErrorType<unknown>;
/**
 * @summary Subject-wise performance analytics
 */
export declare function useGetSubjectPerformance<TData = Awaited<ReturnType<typeof getSubjectPerformance>>, TError = ErrorType<unknown>>(params?: GetSubjectPerformanceParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSubjectPerformance>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get notifications for current user
 */
export declare const getListNotificationsUrl: () => string;
export declare const listNotifications: (options?: RequestInit) => Promise<Notification[]>;
export declare const getListNotificationsQueryKey: () => readonly ["/api/notifications"];
export declare const getListNotificationsQueryOptions: <TData = Awaited<ReturnType<typeof listNotifications>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listNotifications>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listNotifications>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListNotificationsQueryResult = NonNullable<Awaited<ReturnType<typeof listNotifications>>>;
export type ListNotificationsQueryError = ErrorType<unknown>;
/**
 * @summary Get notifications for current user
 */
export declare function useListNotifications<TData = Awaited<ReturnType<typeof listNotifications>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listNotifications>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Mark notification as read
 */
export declare const getMarkNotificationReadUrl: (id: number) => string;
export declare const markNotificationRead: (id: number, options?: RequestInit) => Promise<void>;
export declare const getMarkNotificationReadMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof markNotificationRead>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof markNotificationRead>>, TError, {
    id: number;
}, TContext>;
export type MarkNotificationReadMutationResult = NonNullable<Awaited<ReturnType<typeof markNotificationRead>>>;
export type MarkNotificationReadMutationError = ErrorType<unknown>;
/**
 * @summary Mark notification as read
 */
export declare const useMarkNotificationRead: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof markNotificationRead>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof markNotificationRead>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Mark all notifications read
 */
export declare const getMarkAllNotificationsReadUrl: () => string;
export declare const markAllNotificationsRead: (options?: RequestInit) => Promise<void>;
export declare const getMarkAllNotificationsReadMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof markAllNotificationsRead>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof markAllNotificationsRead>>, TError, void, TContext>;
export type MarkAllNotificationsReadMutationResult = NonNullable<Awaited<ReturnType<typeof markAllNotificationsRead>>>;
export type MarkAllNotificationsReadMutationError = ErrorType<unknown>;
/**
 * @summary Mark all notifications read
 */
export declare const useMarkAllNotificationsRead: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof markAllNotificationsRead>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof markAllNotificationsRead>>, TError, void, TContext>;
export {};
//# sourceMappingURL=api.d.ts.map