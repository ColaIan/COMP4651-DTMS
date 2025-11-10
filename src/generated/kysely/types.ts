import type { ColumnType } from "kysely";
export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export type Account = {
    id: string;
    accountId: string;
    providerId: string;
    userId: string;
    accessToken: string | null;
    refreshToken: string | null;
    idToken: string | null;
    accessTokenExpiresAt: Timestamp | null;
    refreshTokenExpiresAt: Timestamp | null;
    scope: string | null;
    password: string | null;
    createdAt: Generated<Timestamp>;
    updatedAt: Timestamp;
};
export type Instructor = {
    user_id: string;
    booking_leading_time: Generated<number>;
};
export type InstructorAvailability = {
    id: string;
    instructor_id: string;
    start_time: Timestamp;
    end_time: Timestamp;
};
export type Learner = {
    user_id: string;
    license_number: string;
    license_expiry: Timestamp;
};
export type ScoreSheet = {
    id: string;
    training_id: string;
    data: Generated<string>;
    created_at: Generated<Timestamp>;
    updated_at: Timestamp;
};
export type Session = {
    id: string;
    expiresAt: Timestamp;
    token: string;
    createdAt: Generated<Timestamp>;
    updatedAt: Timestamp;
    ipAddress: string | null;
    userAgent: string | null;
    userId: string;
};
export type Training = {
    id: string;
    instructor_id: string;
    learner_id: string;
    start_time: Timestamp;
    end_time: Timestamp;
    status: Generated<string>;
    created_at: Generated<Timestamp>;
    updated_at: Timestamp;
};
export type User = {
    id: string;
    name: string;
    email: string;
    emailVerified: Generated<boolean>;
    image: string | null;
    role: Generated<string>;
    createdAt: Generated<Timestamp>;
    updatedAt: Timestamp;
};
export type Verification = {
    id: string;
    identifier: string;
    value: string;
    expiresAt: Timestamp;
    createdAt: Generated<Timestamp>;
    updatedAt: Generated<Timestamp>;
};
export type DB = {
    account: Account;
    instructor: Instructor;
    instructor_availability: InstructorAvailability;
    learner: Learner;
    score_sheet: ScoreSheet;
    session: Session;
    training: Training;
    user: User;
    verification: Verification;
};
