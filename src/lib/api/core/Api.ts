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

import type {
  BookingCountRes,
  BookingPrincipalRes,
  BookingRes,
  CreateBookingReq,
  CreatePassengerReq,
  CreateUserReq,
  ErrorInfo,
  LatestScheduleRes,
  PassengerPrincipalRes,
  PassengerRes,
  ScheduleBulkUpdateReq,
  SchedulePrincipalRes,
  ScheduleRecordReq,
  TimingPrincipalRes,
  TimingReq,
  TimingRes,
  UpdatePassengerReq,
  UpdateUserReq,
  UserExistRes,
  UserPrincipalRes,
  UserRes,
} from "./data-contracts";
import { ContentType, HttpClient, type RequestParams } from "./http-client";

export class Api<
  SecurityDataType = unknown,
> extends HttpClient<SecurityDataType> {
  /**
   * No description
   *
   * @tags Booking
   * @name VBookingDetail
   * @request GET:/api/v{version}/Booking
   * @secure
   */
  vBookingDetail = (
    version: string,
    query?: {
      Date?: string;
      Direction?: string;
      Time?: string;
      UserId?: string;
      /** @format int32 */
      Limit?: number;
      /** @format int32 */
      Skip?: number;
    },
    params: RequestParams = {},
  ) =>
    this.request<BookingPrincipalRes[], any>({
      path: `/api/v${version}/Booking`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Booking
   * @name VBookingReserveDetail
   * @request GET:/api/v{version}/Booking/reserve/{Direction}/{Date}/{Time}
   * @secure
   */
  vBookingReserveDetail = (
    date: string,
    direction: string,
    time: string,
    version: string,
    params: RequestParams = {},
  ) =>
    this.request<BookingPrincipalRes, any>({
      path: `/api/v${version}/Booking/reserve/${direction}/${date}/${time}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Booking
   * @name VBookingDetail2
   * @request GET:/api/v{version}/Booking/{userId}/{id}
   * @originalName vBookingDetail
   * @duplicate
   * @secure
   */
  vBookingDetail2 = (
    userId: string,
    id: string,
    version: string,
    params: RequestParams = {},
  ) =>
    this.request<BookingRes, any>({
      path: `/api/v${version}/Booking/${userId}/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Booking
   * @name VBookingCompleteCreate
   * @request POST:/api/v{version}/Booking/complete/{id}
   * @secure
   */
  vBookingCompleteCreate = (
    id: string,
    version: string,
    data: {
      /** @format binary */
      file?: File;
    },
    params: RequestParams = {},
  ) =>
    this.request<BookingPrincipalRes, any>({
      path: `/api/v${version}/Booking/complete/${id}`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.FormData,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Booking
   * @name VBookingCountsDetail
   * @request GET:/api/v{version}/Booking/counts
   * @secure
   */
  vBookingCountsDetail = (version: string, params: RequestParams = {}) =>
    this.request<BookingCountRes[], any>({
      path: `/api/v${version}/Booking/counts`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Booking
   * @name VBookingBuyingCreate
   * @request POST:/api/v{version}/Booking/buying/{id}
   * @secure
   */
  vBookingBuyingCreate = (
    id: string,
    version: string,
    params: RequestParams = {},
  ) =>
    this.request<BookingPrincipalRes, any>({
      path: `/api/v${version}/Booking/buying/${id}`,
      method: "POST",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Booking
   * @name VBookingBypassCreate
   * @request POST:/api/v{version}/Booking/bypass/{userId}
   * @secure
   */
  vBookingBypassCreate = (
    userId: string,
    version: string,
    data: CreateBookingReq,
    params: RequestParams = {},
  ) =>
    this.request<BookingPrincipalRes, any>({
      path: `/api/v${version}/Booking/bypass/${userId}`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Booking
   * @name VBookingCancelBypassCreate
   * @request POST:/api/v{version}/Booking/cancel/bypass/{id}
   * @secure
   */
  vBookingCancelBypassCreate = (
    id: string,
    version: string,
    params: RequestParams = {},
  ) =>
    this.request<BookingPrincipalRes, any>({
      path: `/api/v${version}/Booking/cancel/bypass/${id}`,
      method: "POST",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Passenger
   * @name VPassengerDetail
   * @request GET:/api/v{version}/Passenger
   * @secure
   */
  vPassengerDetail = (
    version: string,
    query?: {
      UserId?: string;
      Name?: string;
      /** @format int32 */
      Limit?: number;
      /** @format int32 */
      Skip?: number;
    },
    params: RequestParams = {},
  ) =>
    this.request<PassengerPrincipalRes[], any>({
      path: `/api/v${version}/Passenger`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Passenger
   * @name VPassengerDetail2
   * @request GET:/api/v{version}/Passenger/{userId}/{id}
   * @originalName vPassengerDetail
   * @duplicate
   * @secure
   */
  vPassengerDetail2 = (
    userId: string,
    id: string,
    version: string,
    params: RequestParams = {},
  ) =>
    this.request<PassengerRes, any>({
      path: `/api/v${version}/Passenger/${userId}/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Passenger
   * @name VPassengerUpdate
   * @request PUT:/api/v{version}/Passenger/{userId}/{id}
   * @secure
   */
  vPassengerUpdate = (
    userId: string,
    id: string,
    version: string,
    data: UpdatePassengerReq,
    params: RequestParams = {},
  ) =>
    this.request<PassengerPrincipalRes, any>({
      path: `/api/v${version}/Passenger/${userId}/${id}`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Passenger
   * @name VPassengerDelete
   * @request DELETE:/api/v{version}/Passenger/{userId}/{id}
   * @secure
   */
  vPassengerDelete = (
    userId: string,
    id: string,
    version: string,
    params: RequestParams = {},
  ) =>
    this.request<void, any>({
      path: `/api/v${version}/Passenger/${userId}/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Passenger
   * @name VPassengerCreate
   * @request POST:/api/v{version}/Passenger/{userId}
   * @secure
   */
  vPassengerCreate = (
    userId: string,
    version: string,
    data: CreatePassengerReq,
    params: RequestParams = {},
  ) =>
    this.request<PassengerPrincipalRes, any>({
      path: `/api/v${version}/Passenger/${userId}`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Schedule
   * @name VScheduleLatestDetail
   * @request GET:/api/v{version}/Schedule/latest
   * @secure
   */
  vScheduleLatestDetail = (version: string, params: RequestParams = {}) =>
    this.request<LatestScheduleRes, any>({
      path: `/api/v${version}/Schedule/latest`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Schedule
   * @name VScheduleRangeDetail
   * @request GET:/api/v{version}/Schedule/range/{From}/{To}
   * @secure
   */
  vScheduleRangeDetail = (
    from: string,
    to: string,
    version: string,
    params: RequestParams = {},
  ) =>
    this.request<SchedulePrincipalRes[], any>({
      path: `/api/v${version}/Schedule/range/${from}/${to}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Schedule
   * @name VScheduleDetail
   * @request GET:/api/v{version}/Schedule/{Date}
   * @secure
   */
  vScheduleDetail = (
    date: string,
    version: string,
    params: RequestParams = {},
  ) =>
    this.request<SchedulePrincipalRes, any>({
      path: `/api/v${version}/Schedule/${date}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Schedule
   * @name VScheduleUpdate
   * @request PUT:/api/v{version}/Schedule/{Date}
   * @secure
   */
  vScheduleUpdate = (
    date: string,
    version: string,
    data: ScheduleRecordReq,
    params: RequestParams = {},
  ) =>
    this.request<SchedulePrincipalRes, any>({
      path: `/api/v${version}/Schedule/${date}`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Schedule
   * @name VScheduleDelete
   * @request DELETE:/api/v{version}/Schedule/{Date}
   * @secure
   */
  vScheduleDelete = (
    date: string,
    version: string,
    params: RequestParams = {},
  ) =>
    this.request<void, any>({
      path: `/api/v${version}/Schedule/${date}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Schedule
   * @name VScheduleBulkUpdate
   * @request PUT:/api/v{version}/Schedule/bulk
   * @secure
   */
  vScheduleBulkUpdate = (
    version: string,
    data: ScheduleBulkUpdateReq,
    params: RequestParams = {},
  ) =>
    this.request<void, any>({
      path: `/api/v${version}/Schedule/bulk`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags Timing
   * @name VTimingDetail
   * @request GET:/api/v{version}/Timing/{Direction}
   * @secure
   */
  vTimingDetail = (
    direction: string,
    version: string,
    params: RequestParams = {},
  ) =>
    this.request<TimingRes, any>({
      path: `/api/v${version}/Timing/${direction}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Timing
   * @name VTimingUpdate
   * @request PUT:/api/v{version}/Timing/{Direction}
   * @secure
   */
  vTimingUpdate = (
    direction: string,
    version: string,
    data: TimingReq,
    params: RequestParams = {},
  ) =>
    this.request<TimingPrincipalRes, any>({
      path: `/api/v${version}/Timing/${direction}`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags User
   * @name VUserDetail
   * @request GET:/api/v{version}/User
   * @secure
   */
  vUserDetail = (
    version: string,
    query?: {
      Id?: string;
      Username?: string;
      /** @format int32 */
      Limit?: number;
      /** @format int32 */
      Skip?: number;
    },
    params: RequestParams = {},
  ) =>
    this.request<UserPrincipalRes[], any>({
      path: `/api/v${version}/User`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags User
   * @name VUserCreate
   * @request POST:/api/v{version}/User
   * @secure
   */
  vUserCreate = (
    version: string,
    data: CreateUserReq,
    params: RequestParams = {},
  ) =>
    this.request<UserPrincipalRes, any>({
      path: `/api/v${version}/User`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags User
   * @name VUserMeDetail
   * @request GET:/api/v{version}/User/Me
   * @secure
   */
  vUserMeDetail = (version: string, params: RequestParams = {}) =>
    this.request<string, any>({
      path: `/api/v${version}/User/Me`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags User
   * @name VUserDetail2
   * @request GET:/api/v{version}/User/{id}
   * @originalName vUserDetail
   * @duplicate
   * @secure
   */
  vUserDetail2 = (id: string, version: string, params: RequestParams = {}) =>
    this.request<UserRes, any>({
      path: `/api/v${version}/User/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags User
   * @name VUserUpdate
   * @request PUT:/api/v{version}/User/{id}
   * @secure
   */
  vUserUpdate = (
    id: string,
    version: string,
    data: UpdateUserReq,
    params: RequestParams = {},
  ) =>
    this.request<UserPrincipalRes, any>({
      path: `/api/v${version}/User/${id}`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags User
   * @name VUserDelete
   * @request DELETE:/api/v{version}/User/{id}
   * @secure
   */
  vUserDelete = (id: string, version: string, params: RequestParams = {}) =>
    this.request<void, any>({
      path: `/api/v${version}/User/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags User
   * @name VUserUsernameDetail
   * @request GET:/api/v{version}/User/username/{username}
   * @secure
   */
  vUserUsernameDetail = (
    username: string,
    version: string,
    params: RequestParams = {},
  ) =>
    this.request<UserRes, any>({
      path: `/api/v${version}/User/username/${username}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags User
   * @name VUserExistDetail
   * @request GET:/api/v{version}/User/exist/{username}
   * @secure
   */
  vUserExistDetail = (
    username: string,
    version: string,
    params: RequestParams = {},
  ) =>
    this.request<UserExistRes, any>({
      path: `/api/v${version}/User/exist/${username}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags V1Error
   * @name VErrorInfoDetail
   * @request GET:/api/v{version}/error-info
   * @secure
   */
  vErrorInfoDetail = (version: string, params: RequestParams = {}) =>
    this.request<string[], any>({
      path: `/api/v${version}/error-info`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags V1Error
   * @name VErrorInfoDetail2
   * @request GET:/api/v{version}/error-info/{id}
   * @originalName vErrorInfoDetail
   * @duplicate
   * @secure
   */
  vErrorInfoDetail2 = (
    id: string,
    version: string,
    params: RequestParams = {},
  ) =>
    this.request<ErrorInfo, any>({
      path: `/api/v${version}/error-info/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
}
