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

export interface AirwallexEvent {
  id?: string | null;
  name?: string | null;
  account_id?: string | null;
  accountId?: string | null;
  data: AirwallexEventData;
  created_at?: string | null;
  createdAt?: string | null;
  sourceId?: string | null;
}

export interface AirwallexEventData {
  object: AirwallexEventDataObject;
}

export interface AirwallexEventDataObject {
  /** @format double */
  amount: number;
  /** @format double */
  base_amount: number;
  base_currency?: string | null;
  /** @format double */
  captured_amount: number;
  created_at?: string | null;
  currency?: string | null;
  descriptor?: string | null;
  id?: string | null;
  /** @format uuid */
  merchant_order_id: string;
  /** @format uuid */
  request_id: string;
  status?: string | null;
  updated_at?: string | null;
}

export interface AnnouncementBroadcastRes {
  /** @format int32 */
  sent: number;
  /** @format int32 */
  failed: number;
  failedUserIds?: string[] | null;
}

export interface AnnouncementSendRes {
  userId?: string | null;
  email?: string | null;
}

export interface AnnounceFeeReq {
  type: string;
  /** @format uuid */
  changeId?: string | null;
  reasoning?: string | null;
}

export interface BookingCountRes {
  date?: string | null;
  time?: string | null;
  direction?: string | null;
  /** @format int32 */
  ticketsNeeded: number;
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
  id: string;
  userId?: string | null;
  date?: string | null;
  time?: string | null;
  direction?: string | null;
  passenger: BookingPassengerRes;
  /** @format date-time */
  createdAt: string;
  /** @format date-time */
  completedAt?: string | null;
  ticketLink?: string | null;
  ticketNo?: string | null;
  bookingNo?: string | null;
  status?: string | null;
  priority: boolean;
}

export interface BookingQueueRes {
  status?: string | null;
  /** @format int32 */
  position?: number | null;
  /** @format int32 */
  total?: number | null;
}

export interface BookingRes {
  principal: BookingPrincipalRes;
  user: UserPrincipalRes;
}

export interface BookingSearchCountRes {
  /** @format int32 */
  total: number;
}

export interface BookingStatRes {
  dayOfWeek?: string | null;
  time?: string | null;
  direction?: string | null;
  bucket?: string | null;
  priority: boolean;
  demandBucket?: string | null;
  deliveryBucket?: string | null;
  /** @format int32 */
  total: number;
  /** @format int32 */
  completed: number;
  /** @format int32 */
  refunded: number;
  /** @format int32 */
  cancelled: number;
  /** @format int32 */
  terminated: number;
  /** @format int32 */
  other: number;
}

export interface CancelWithdrawalReq {
  note?: string | null;
}

export interface CostPrincipalRes {
  /** @format uuid */
  id: string;
  /** @format date-time */
  createdAt: string;
  /** @format double */
  cost: number;
}

export interface CostPolicyReq {
  name?: string | null;
  enabled: boolean;
  matchDate?: string | null;
  matchTime?: string | null;
  matchDayOfWeek?: string | null;
  matchDirection?: string | null;
  /** @format int32 */
  leadTimeUnderHours?: number | null;
  /** @format double */
  amount: number;
  isPercentage: boolean;
  /** @format date-time */
  effectiveAt?: string | null;
  /** @format date-time */
  expiresAt?: string | null;
}

export interface CostPolicyPrincipalRes {
  /** @format uuid */
  id: string;
  /** @format date-time */
  createdAt: string;
  name?: string | null;
  enabled: boolean;
  matchDate?: string | null;
  matchTime?: string | null;
  matchDayOfWeek?: string | null;
  matchDirection?: string | null;
  /** @format int32 */
  leadTimeUnderHours?: number | null;
  /** @format double */
  amount: number;
  isPercentage: boolean;
  /** @format date-time */
  effectiveAt?: string | null;
  /** @format date-time */
  expiresAt?: string | null;
}

export interface CostPolicyLineRes {
  name?: string | null;
  /** @format double */
  delta: number;
}

export interface CostSummaryRes {
  /** @format double */
  baseCost: number;
  policyLines?: CostPolicyLineRes[] | null;
  /** @format double */
  subtotal: number;
  discounts?: DiscountRecordRes[] | null;
  /** @format double */
  final: number;
  /** Exact decimal token. Optional only during the old-Zinc rollout window. */
  quote?: string | null;
}

export interface CostSlotSummaryRes {
  time?: string | null;
  /** @format double */
  baseCost: number;
  policyLines?: CostPolicyLineRes[] | null;
  /** @format double */
  subtotal: number;
  discounts?: DiscountRecordRes[] | null;
  /** @format double */
  final: number;
  /** Exact decimal token. Optional only during the old-Zinc rollout window. */
  quote?: string | null;
}

export interface PriorityEligibilityRes {
  eligible: boolean;
  /** @format double */
  fee: number;
  /**
   * HAND-ADDED (zinc PR #37): the calling user boosts FREE (fee is 0 when
   * true). Optional only during the old-Zinc rollout window — treat a
   * missing value as false.
   */
  free?: boolean;
}

export interface PrioritySettingsRes {
  /** @format double */
  fee: number;
  allowAll: boolean;
  windowStartSgt?: string | null;
  windowEndSgt?: string | null;
  /**
   * HAND-ADDED (zinc PR #37): who boosts free (fee 0, no ledger row), the
   * same All/Any/None-over-UserId/Role shape as discount targets.
   * null = nobody boosts free.
   */
  freeTarget?: DiscountTargetRes | null;
  /**
   * HAND-ADDED (zinc PR #37): who may prioritize at all. When set it takes
   * precedence over allowAll/the allowlist; null keeps legacy behavior.
   */
  accessTarget?: DiscountTargetRes | null;
}

export interface SetPrioritySettingsReq {
  /** @format double */
  fee: number;
  allowAll: boolean;
  windowStartSgt?: string | null;
  windowEndSgt?: string | null;
  /** HAND-ADDED (zinc PR #37): see PrioritySettingsRes.freeTarget */
  freeTarget?: DiscountTargetReq | null;
  /** HAND-ADDED (zinc PR #37): see PrioritySettingsRes.accessTarget */
  accessTarget?: DiscountTargetReq | null;
}

/**
 * HAND-ADDED (zinc PR #37). One sales-analysis row: completed bookings
 * bucketed by the SGT calendar date of completion (dd-MM-yyyy), direction
 * and departure time; grossRevenue = the booking cost collected at
 * completion.
 */
export interface BookingAnalysisRowRes {
  date: string;
  direction: string;
  time: string;
  /** @format int32 */
  ticketsCompleted: number;
  /** @format double */
  grossRevenue: number;
}

/** HAND-ADDED (zinc PR #37). Deposits captured in the range. */
export interface DepositSummaryRes {
  /** @format int32 */
  count: number;
  /** @format double */
  captured: number;
}

/**
 * HAND-ADDED (zinc PR #37). BunnyBooker's internal fees over the range.
 * Priority is NET (charges minus refunds); termination = collected cost of
 * terminated bookings minus what was refunded.
 */
export interface InternalFeesRes {
  /** @format double */
  deposit: number;
  /** @format double */
  withdrawal: number;
  /** @format double */
  priority: number;
  /** @format double */
  termination: number;
}

/** HAND-ADDED (zinc PR #37). Range totals for the analysis page. */
export interface BookingAnalysisSummaryRes {
  /** @format int32 */
  totalTickets: number;
  /** @format double */
  totalGross: number;
  deposits: DepositSummaryRes;
  internalFees: InternalFeesRes;
}

/** HAND-ADDED (zinc PR #37). GET Booking/analysis response. */
export interface BookingAnalysisRes {
  rows: BookingAnalysisRowRes[];
  summary: BookingAnalysisSummaryRes;
}

/**
 * HAND-ADDED (zinc PR #37). One captured payment intent (newest first);
 * paymentIntentId = the gateway's external reference (the Airwallex intent
 * id).
 */
export interface CapturedPaymentRes {
  paymentIntentId: string;
  /** @format double */
  capturedAmount: number;
  currency: string;
  /** @format date-time */
  createdAt: string;
  status: string;
}

export interface PriorityAccessRes {
  userId?: string | null;
  /** @format date-time */
  createdAt: string;
}

export interface CreateBookingReq {
  date?: string | null;
  time?: string | null;
  direction?: string | null;
  passenger: BookingPassengerReq;
  expectedCost: string;
}

export interface CreateCostReq {
  /** @format double */
  cost: number;
}

export interface CreateDiscountReq {
  target: DiscountTargetReq;
  record: DiscountRecordReq;
}

export interface CreateMilestoneReq {
  date: string;
  /** @maxLength 256 */
  label: string;
}

export interface CreatePassengerReq {
  fullName?: string | null;
  gender?: string | null;
  passportExpiry?: string | null;
  passportNumber?: string | null;
}

export interface CreatePaymentReq {
  /** @format double */
  amount: number;
  currency?: string | null;
}

export interface CreatePaymentRes {
  /** @format uuid */
  id: string;
  externalReference?: string | null;
  gateway?: string | null;
  secret?: string | null;
  /** @format date-time */
  createdAt: string;
  statuses?: Record<string, string>;
  /** @format double */
  amount: number;
  currency?: string | null;
  status?: string | null;
  /** @format date-time */
  lastUpdated: string;
  additionalData?: any;
}

export interface CreateUserReq {
  username?: string | null;
  idToken?: string | null;
  accessToken?: string | null;
}

export interface CreateWithdrawalReq {
  /** @format double */
  amount: number;
  payNowNumber?: string | null;
  /**
   * HAND-ADDED (zinc PR #36): "PayNow" (default when omitted, rollout compat)
   * or "CardRefund". PayNow requires payNowNumber; CardRefund forbids it.
   */
  method?: string | null;
}

export interface DiscountMatchReq {
  value?: string | null;
  matchType?: string | null;
}

export interface DiscountMatchRes {
  value?: string | null;
  matchType?: string | null;
}

export interface DiscountPrincipalRes {
  /** @format uuid */
  id: string;
  record: DiscountRecordRes;
  status: DiscountStatusRes;
  target: DiscountTargetRes;
}

export interface DiscountRecordReq {
  name?: string | null;
  description?: string | null;
  /** @format double */
  amount: number;
  type?: string | null;
  matchDate?: string | null;
  matchTime?: string | null;
  matchDayOfWeek?: string | null;
  matchDirection?: string | null;
  /** @format int32 */
  leadTimeAtLeastHours?: number | null;
  /** @format date-time */
  effectiveAt?: string | null;
  /** @format date-time */
  expiresAt?: string | null;
}

export interface DiscountRecordRes {
  name?: string | null;
  description?: string | null;
  /** @format double */
  amount: number;
  type?: string | null;
  matchDate?: string | null;
  matchTime?: string | null;
  matchDayOfWeek?: string | null;
  matchDirection?: string | null;
  /** @format int32 */
  leadTimeAtLeastHours?: number | null;
  /** @format date-time */
  effectiveAt?: string | null;
  /** @format date-time */
  expiresAt?: string | null;
}

export interface DiscountStatusReq {
  disabled: boolean;
}

export interface DiscountStatusRes {
  disabled: boolean;
}

export interface DiscountTargetReq {
  matchMode?: string | null;
  matches?: DiscountMatchReq[] | null;
}

export interface DiscountTargetRes {
  matchMode?: string | null;
  matches?: DiscountMatchRes[] | null;
}

export interface ErrorInfo {
  schema?: any;
  id?: string | null;
  title?: string | null;
  version?: string | null;
}

export interface FeeChangeRes {
  /** @format uuid */
  id: string;
  type?: string | null;
  /** @format double */
  percentage: number;
  /** @format double */
  flatAmount: number;
  /** @format date-time */
  effectiveAt: string;
  /** @format double */
  cap?: number | null;
}

export interface FeeRes {
  /** @format double */
  percentage: number;
  /** @format double */
  flatAmount: number;
  /** @format double */
  cap?: number | null;
}

export interface LatestScheduleRes {
  date?: string | null;
}

export interface MaterializedCostRes {
  /** @format double */
  cost: number;
  policyLines?: CostPolicyLineRes[] | null;
  /** @format double */
  subtotal: number;
  /** @format double */
  final: number;
  discounts?: DiscountRecordRes[] | null;
}

export interface MilestoneRes {
  /** @format uuid */
  id: string;
  date: string;
  label: string;
  /** @format date-time */
  createdAt: string;
}

/** @deprecated Zinc names this response MilestoneRes. */
export type MilestonePrincipalRes = MilestoneRes;

export interface PassengerPrincipalRes {
  /** @format uuid */
  id: string;
  userId?: string | null;
  fullName?: string | null;
  gender?: string | null;
  passportExpiry?: string | null;
  passportNumber?: string | null;
}

export interface PassengerRes {
  principal: PassengerPrincipalRes;
  user: UserPrincipalRes;
}

export interface PaymentPrincipalRes {
  /** @format uuid */
  id: string;
  externalReference?: string | null;
  gateway?: string | null;
  /** @format date-time */
  createdAt: string;
  statuses?: Record<string, string>;
  /** @format double */
  amount: number;
  /** @format double */
  capturedAmount: number;
  currency?: string | null;
  status?: string | null;
  /** @format date-time */
  lastUpdated: string;
  additionalData?: any;
}

export interface PaymentRes {
  principal: PaymentPrincipalRes;
  wallet: WalletPrincipalRes;
  transaction: TransactionPrincipalRes;
}

export interface RejectWithdrawalReq {
  note?: string | null;
}

export interface ScheduleBulkUpdateReq {
  schedules?: SchedulePrincipalReq[] | null;
}

export interface SchedulePrincipalReq {
  date?: string | null;
  record: ScheduleRecordReq;
}

export interface SchedulePrincipalRes {
  date?: string | null;
  confirmed: boolean;
  jToWExcluded?: string[] | null;
  wToJExcluded?: string[] | null;
}

export interface ScheduleRecordReq {
  confirmed: boolean;
  jToWExcluded?: string[] | null;
  wToJExcluded?: string[] | null;
}

export interface SetFeeReq {
  /**
   * @format double
   * @min 0
   * @max 100
   */
  percentage: number;
  /**
   * @format double
   * @min 0
   * @max 10000
   */
  flatAmount: number;
  /** @format date-time */
  effectiveAt?: string | null;
  /**
   * @format double
   * @min 0
   * @max 100000
   */
  cap?: number | null;
}

export interface TimingPrincipalRes {
  direction?: string | null;
  timings?: string[] | null;
}

export interface TimingReq {
  timings?: string[] | null;
}

export interface TimingRes {
  principal: TimingPrincipalRes;
}

export interface TransactionPrincipalRes {
  /** @format uuid */
  id: string;
  /** @format date-time */
  createdAt: string;
  name?: string | null;
  description?: string | null;
  transactionType?: string | null;
  /** @format double */
  amount: number;
  from?: string | null;
  to?: string | null;
}

export interface TransactionRes {
  principal: TransactionPrincipalRes;
  wallet: WalletPrincipalRes;
}

export interface TransferReq {
  /** @format double */
  amount: number;
  desc?: string | null;
}

export interface UpdateDiscountReq {
  target: DiscountTargetReq;
  record: DiscountRecordReq;
  status: DiscountStatusReq;
}

export interface UpdatePassengerReq {
  fullName?: string | null;
  gender?: string | null;
  passportExpiry?: string | null;
  passportNumber?: string | null;
}

export interface UpdateUserReq {
  username?: string | null;
  idToken?: string | null;
  accessToken?: string | null;
}

export interface UserExistRes {
  exists: boolean;
}

export interface UserPrincipalRes {
  id?: string | null;
  username?: string | null;
  email?: string | null;
  emailVerified?: boolean | null;
  roles?: string[] | null;
  extraRoles?: string[] | null;
}

export interface UserRes {
  principal: UserPrincipalRes;
  wallet: WalletPrincipalRes;
}

export interface WalletPrincipalRes {
  /** @format uuid */
  id: string;
  userId?: string | null;
  /** @format double */
  usable: number;
  /** @format double */
  withdrawReserve: number;
  /** @format double */
  bookingReserve: number;
}

export interface WalletRes {
  principal: WalletPrincipalRes;
  user: UserPrincipalRes;
}

export interface WithdrawalCompleteRes {
  /** @format date-time */
  completedAt: string;
  note?: string | null;
  receipt?: string | null;
}

export interface WithdrawalPayoutRes {
  confirmationNumber?: string | null;
  /** @format double */
  fee: number;
  /** @format int32 */
  reconcileAttempts: number;
}

export interface WithdrawalPrincipalRes {
  /** @format uuid */
  id: string;
  /** @format date-time */
  createAt: string;
  status: WithdrawalStatusRes;
  record: WithdrawalRecordRes;
  complete: WithdrawalCompleteRes;
  payout?: WithdrawalPayoutRes | null;
}

export interface WithdrawalRecordRes {
  /** @format double */
  amount: number;
  payNowNumber?: string | null;
  /** HAND-ADDED (zinc PR #36): "PayNow" or "CardRefund" */
  method: string;
}

/**
 * HAND-ADDED (zinc PR #36). Card-refund evidence: one row per refund created
 * against a funding payment intent. Status: Created | Settled | Failed.
 */
export interface WithdrawalRefundRes {
  paymentIntentId: string;
  airwallexRefundId?: string | null;
  /** @format double */
  amount: number;
  status: string;
  /** @format date-time */
  createdAt: string;
  /** @format date-time */
  settledAt?: string | null;
}

/**
 * HAND-ADDED (zinc PR #36). GET Withdrawal/refundable/{userId}: how much the
 * user could withdraw via card refunds right now, and the window (days) the
 * pool was computed over.
 */
export interface RefundablePoolRes {
  /** @format double */
  pool: number;
  /** @format int32 */
  windowDays: number;
}

/**
 * HAND-ADDED (zinc withdrawal-policy PR) pending swagger regeneration.
 * GET Withdrawal/settings/current: the platform withdrawal-method policy.
 * When zinc has no settings row it answers the defaults
 * { cardRefundEnabled: true, payNowMode: "FallbackOnly", sweepEnabled: false }.
 */
export interface WithdrawalSettingsRes {
  cardRefundEnabled: boolean;
  /** "Enabled" | "Disabled" | "FallbackOnly" */
  payNowMode: string;
  sweepEnabled: boolean;
}

/**
 * HAND-ADDED (zinc withdrawal-policy PR) pending swagger regeneration.
 * POST Withdrawal/settings (admin): same shape as the current settings.
 */
export interface SetWithdrawalSettingsReq {
  cardRefundEnabled: boolean;
  /** "Enabled" | "Disabled" | "FallbackOnly" */
  payNowMode: string;
  sweepEnabled: boolean;
}

export interface WithdrawalRes {
  principal: WithdrawalPrincipalRes;
  user: UserPrincipalRes;
  completer: UserPrincipalRes;
  wallet: WalletPrincipalRes;
  /** HAND-ADDED (zinc PR #36): card-refund evidence fragments */
  refunds: WithdrawalRefundRes[];
}

export interface WithdrawalStatusRes {
  status?: string | null;
}
