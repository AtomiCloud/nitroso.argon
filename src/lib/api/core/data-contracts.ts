/* eslint-disable */
/* tslint:disable */
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export interface BookingCountRes {
  date?: string | null;
  time?: string | null;
  direction?: string | null;
  /** @format int32 */
  ticketsNeeded?: number;
}

export interface BookingPassengerReq {
  fullName?: string | null;
  gender?: string | null;
  passportExpiry?: string | null;
  passportNumber?: string | null;
}

export interface BookingPassengerRes {
  fullName?: string | null;
  gender?: string | null;
  passportExpiry?: string | null;
  passportNumber?: string | null;
}

export interface BookingPrincipalRes {
  /** @format uuid */
  id?: string;
  date?: string | null;
  time?: string | null;
  direction?: string | null;
  passenger?: BookingPassengerRes;
  /** @format date-time */
  createdAt?: string;
  /** @format date-time */
  completedAt?: string | null;
  ticketLink?: string | null;
  status?: string | null;
}

export interface BookingRes {
  principal?: BookingPrincipalRes;
  user?: UserPrincipalRes;
}

export interface CreateBookingReq {
  date?: string | null;
  time?: string | null;
  direction?: string | null;
  passenger?: BookingPassengerReq;
}

export interface CreatePassengerReq {
  fullName?: string | null;
  gender?: string | null;
  passportExpiry?: string | null;
  passportNumber?: string | null;
}

export interface CreateUserReq {
  username?: string | null;
}

export interface ErrorInfo {
  schema?: any;
  id?: string | null;
  title?: string | null;
  version?: string | null;
}

export interface LatestScheduleRes {
  date?: string | null;
}

export interface PassengerPrincipalRes {
  /** @format uuid */
  id?: string;
  fullName?: string | null;
  gender?: string | null;
  passportExpiry?: string | null;
  passportNumber?: string | null;
}

export interface PassengerRes {
  principal?: PassengerPrincipalRes;
  user?: UserPrincipalRes;
}

export interface ScheduleBulkUpdateReq {
  schedules?: SchedulePrincipalReq[] | null;
}

export interface SchedulePrincipalReq {
  date?: string | null;
  record?: ScheduleRecordReq;
}

export interface SchedulePrincipalRes {
  date?: string | null;
  confirmed?: boolean;
  jToWExcluded?: string[] | null;
  wToJExcluded?: string[] | null;
}

export interface ScheduleRecordReq {
  confirmed?: boolean;
  jToWExcluded?: string[] | null;
  wToJExcluded?: string[] | null;
}

export interface TimingPrincipalRes {
  direction?: string | null;
  timings?: string[] | null;
}

export interface TimingReq {
  timings?: string[] | null;
}

export interface TimingRes {
  principal?: TimingPrincipalRes;
}

export interface UpdatePassengerReq {
  fullName?: string | null;
  gender?: string | null;
  passportExpiry?: string | null;
  passportNumber?: string | null;
}

export interface UpdateUserReq {
  username?: string | null;
}

export interface UserExistRes {
  exists?: boolean;
}

export interface UserPrincipalRes {
  id?: string | null;
  username?: string | null;
}

export interface UserRes {
  principal?: UserPrincipalRes;
}
