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
  /**
   * HAND-ADDED (zinc PR #39): queue split — ticketsNeeded = priority +
   * normal. Optional only during the old-Zinc rollout window; fall back to
   * ticketsNeeded when absent.
   * @format int32
   */
  priority?: number;
  /**
   * HAND-ADDED (zinc PR #39): see priority.
   * @format int32
   */
  normal?: number;
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
  /** @format int32 */
  priorityTotal?: number | null;
  /** @format int32 */
  normalTotal?: number | null;
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
  /**
   * HAND-ADDED (zinc PR #43): null when a percent fee cannot be computed
   * without a booking in scope; always concrete on the booking-scoped
   * endpoint when eligible.
   * @format double
   */
  fee?: number | null;
  /**
   * HAND-ADDED (zinc PR #37): the calling user boosts FREE (fee is 0 when
   * true). Optional only during the old-Zinc rollout window — treat a
   * missing value as false.
   */
  free?: boolean;
  /**
   * HAND-ADDED (zinc PR #42): only when the matched rule caps the timeslot;
   * null/missing otherwise.
   * @format int32
   */
  slotCap?: number | null;
  /** HAND-ADDED (zinc PR #42): remaining priority slots in the timeslot. @format int32 */
  slotsLeft?: number | null;
  /** HAND-ADDED (zinc PR #43): the rule that decided, for admin debugging */
  policyName?: string | null;
}

/**
 * HAND-ADDED (zinc PR #43): one rule of THE unified priority system — who
 * (target), when (SGT window and/or hours-to-departure [min, max)), allow or
 * deny, fee (Flat SGD or Percent of the booking's ticket; 0 = free) and an
 * optional per-timeslot slot cap. First matching rule decides; no match =
 * deny.
 */
export interface PriorityPolicyRes {
  name: string;
  allow: boolean;
  target?: DiscountTargetRes | null;
  windowStartSgt?: string | null;
  windowEndSgt?: string | null;
  /** @format double */
  minHoursToDeparture?: number | null;
  /** @format double */
  maxHoursToDeparture?: number | null;
  /** "Flat" | "Percent" */
  feeKind: string;
  /** @format double */
  feeValue: number;
  /** @format int32 */
  slotCap?: number | null;
}

/** HAND-ADDED (zinc PR #43): request twin of PriorityPolicyRes */
export interface PriorityPolicyReq {
  name: string;
  allow: boolean;
  target?: DiscountTargetReq | null;
  windowStartSgt?: string | null;
  windowEndSgt?: string | null;
  /** @format double */
  minHoursToDeparture?: number | null;
  /** @format double */
  maxHoursToDeparture?: number | null;
  /** "Flat" | "Percent" */
  feeKind?: string;
  /** @format double */
  feeValue?: number;
  /** @format int32 */
  slotCap?: number | null;
}

/**
 * HAND-ADDED (zinc PR #43): the unified priority settings — ONE ordered
 * policy list, nothing else. Legacy rows are synthesized into equivalent
 * rules server-side, so this shape is all the frontend ever sees.
 */
export interface PrioritySettingsRes {
  policies: PriorityPolicyRes[];
}

/** HAND-ADDED (zinc PR #43): request twin of PrioritySettingsRes */
export interface SetPrioritySettingsReq {
  policies: PriorityPolicyReq[];
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
  /**
   * HAND-ADDED (zinc PR #39): admin-configured effective-dated KTMB ticket
   * cost attributed to the row (0 when never configured). Optional only
   * during the old-Zinc rollout window — treat a missing value as 0.
   * @format double
   */
  ktmbCost?: number;
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

/**
 * HAND-ADDED (zinc PR #39). Gateway-fee sync coverage over the range's
 * captured intents — fees post with delay, so paymentsWithFee <
 * paymentsTotal means "sync again later".
 */
export interface GatewayFeeCoverageRes {
  /** @format int32 */
  paymentsWithFee: number;
  /** @format int32 */
  paymentsTotal: number;
}

/**
 * HAND-ADDED (zinc PR #39). Airwallex's own fees: payments = fees on
 * captured intents (money in), payouts = fees on transfers + card refunds
 * (money out).
 */
export interface GatewayFeesRes {
  /** @format double */
  payments: number;
  /** @format double */
  payouts: number;
  coverage: GatewayFeeCoverageRes;
}

/** HAND-ADDED (zinc PR #39). Per-direction slice of the completed rows. */
export interface DirectionBreakdownRes {
  direction: string;
  /** @format int32 */
  tickets: number;
  /** @format double */
  gross: number;
  /** @format double */
  ktmbCost: number;
}

/**
 * HAND-ADDED (zinc PR #39). One SGT calendar month ("MM-yyyy").
 * net = gross − ktmbCost − gatewayPaymentFees − gatewayPayoutFees.
 * internalFees (deposit + withdrawal + net priority) is BunnyBooker's own
 * fee revenue that month — context only, never subtracted.
 */
export interface MonthlyAnalysisRes {
  month: string;
  /** @format double */
  gross: number;
  /** @format double */
  ktmbCost: number;
  /** @format double */
  gatewayPaymentFees: number;
  /** @format double */
  gatewayPayoutFees: number;
  /** @format double */
  internalFees: number;
  /** @format double */
  net: number;
  byDirection: DirectionBreakdownRes[];
}

/**
 * HAND-ADDED (zinc PR #39). One pricing component's aggregate:
 * kind = "policy" (signed delta) | "discount" (negative) | "priorityFee"
 * (positive) — ranks which components make or lose money over the range.
 */
export interface PriceComponentRes {
  kind: string;
  name: string;
  /** @format int32 */
  timesApplied: number;
  /** @format double */
  totalDelta: number;
}

/**
 * HAND-ADDED (zinc PR #39). Breakdown persistence started with the release
 * that added it — completed bookings without a stored breakdown are excluded
 * from components.
 */
export interface ComponentsCoverageRes {
  /** @format int32 */
  withBreakdown: number;
  /** @format int32 */
  total: number;
}

/**
 * HAND-ADDED (zinc ktmb actual cost). Actual-KTMB-cost coverage over the
 * range: withActual = completed tickets whose KTMB cost came from the actual
 * recorded amount (converted via the effective MYR→SGD FX rate); total =
 * completed tickets counted for KTMB cost. The rest fell back to the
 * per-direction estimate.
 */
export interface KtmbActualCoverageRes {
  /** @format int32 */
  withActual: number;
  /** @format int32 */
  total: number;
}

/**
 * HAND-ADDED (zinc PR #37, EXTENDED by PR #39 with totalKtmbCost,
 * gatewayFees and byDirection). Range totals for the analysis page.
 * The PR #39 fields are optional only during the old-Zinc rollout window.
 */
export interface BookingAnalysisSummaryRes {
  /** @format int32 */
  totalTickets: number;
  /** @format double */
  totalGross: number;
  /** @format double */
  totalKtmbCost?: number;
  deposits: DepositSummaryRes;
  internalFees: InternalFeesRes;
  gatewayFees?: GatewayFeesRes;
  byDirection?: DirectionBreakdownRes[];
  /**
   * HAND-ADDED (zinc ktmb actual cost). Absent on older zinc that predates
   * actual-cost recording — the UI hides the coverage line when omitted.
   */
  ktmbActualCoverage?: KtmbActualCoverageRes;
}

/**
 * HAND-ADDED (zinc PR #37, EXTENDED by PR #39 with monthly, components and
 * componentsCoverage). GET Booking/analysis response. The PR #39 fields are
 * optional only during the old-Zinc rollout window.
 */
export interface BookingAnalysisRes {
  rows: BookingAnalysisRowRes[];
  summary: BookingAnalysisSummaryRes;
  monthly?: MonthlyAnalysisRes[];
  components?: PriceComponentRes[];
  componentsCoverage?: ComponentsCoverageRes;
}

/**
 * HAND-ADDED (zinc PR #39). One boost-ledger row: fee null = the boost was
 * free; boostedAt falls back to the booking's createdAt for boosts predating
 * the PrioritizedAt stamp; grantedBy = the admin's userId when an admin
 * boosted someone else's booking (null before that release and for
 * self-boosts).
 */
export interface BookingBoostRes {
  /** @format uuid */
  bookingId: string;
  userId: string;
  userIdentity: string;
  date: string;
  time: string;
  direction: string;
  /** @format double */
  fee?: number | null;
  free: boolean;
  /** @format date-time */
  boostedAt: string;
  grantedBy?: string | null;
}

/** HAND-ADDED (zinc PR #39). GET Booking/analysis/boosts response. */
export interface BookingBoostPageRes {
  /** @format int32 */
  total: number;
  items: BookingBoostRes[];
}

/**
 * HAND-ADDED (zinc travel-date analysis) pending swagger regeneration — one
 * (travel-date, direction, 6h bucket) row counting how many tickets were
 * SECURED for that travel date in that quarter of the day. Only non-empty
 * buckets are returned; missing buckets in the UI mean 0. date is dd-MM-yyyy
 * (zinc's API date format), direction is WToJ or JToW, quarterStartHour is 0,
 * 6, 12 or 18.
 */
export interface TravelAnalysisBucketRes {
  date: string;
  direction: string;
  /** @format int32 */
  quarterStartHour: number;
  /** @format int32 */
  tickets: number;
}

/**
 * HAND-ADDED (zinc profit-by-travel-day) pending swagger regeneration —
 * one (travel-date, 6h quarter-of-day) bucket of completed bookings on
 * this admin's P&L view (revenue − ktmb cost; both directions merged,
 * only the SGT travel date matters). date is dd-MM-yyyy (zinc's API
 * date format), quarterStartHour is 0, 6, 12 or 18. Only non-empty
 * buckets are returned; the UI zero-fills the rest. withActualCost < tickets
 * means some bookings in the bucket still lack an actual KTMB cost and
 * the cost number is partial.
 */
export interface BookingAnalysisProfitBucketRes {
  date: string;
  /** @format int32 */
  quarterStartHour: number;
  /** @format int32 */
  tickets: number;
  /** @format double */
  revenue: number;
  /** @format double */
  cost: number;
  /** @format int32 */
  withActualCost: number;
}

/**
 * HAND-ADDED (zinc P&L tab) pending swagger regeneration — one month of the
 * P&L rollup returned by GET Booking/analysis/pnl. Sorted ascending by month
 * (zinc guarantees the order). month is zinc's MM-yyyy wire format. Only
 * months with activity are returned; the UI zero-fills the gaps across the
 * picked range. gatewayFees may be 0 while the Airwallex fee backfill is
 * still running.
 */
export interface BookingAnalysisPnlRowRes {
  /** @format string */
  month: string;
  /** @format double */
  deposits: number;
  /** @format int32 */
  withdrawalCount: number;
  /** @format double */
  withdrawalTotal: number;
  /** @format double */
  withdrawalFeeIncome: number;
  /** @format double */
  gatewayFees: number;
  /** @format double */
  ticketRevenue: number;
  /** @format double */
  ktmbCost: number;
}

/**
 * HAND-ADDED (zinc PR #39). One queued KTMB ticket-cost change
 * (insert-only, effective-dated like the withdrawal fee queue).
 */
export interface KtmbCostChangeRes {
  /** @format uuid */
  id: string;
  direction: string;
  /** @format double */
  cost: number;
  /** @format date-time */
  effectiveAt: string;
  /** @format date-time */
  createdAt: string;
}

/**
 * HAND-ADDED (zinc PR #39). GET Booking/ktmb-cost/current response:
 * current = direction name ("JToW" | "WToJ") → currently effective cost
 * (a direction key is absent when never configured); upcoming = queued
 * future changes, soonest first.
 */
export interface KtmbCostRes {
  current: Record<string, number>;
  upcoming: KtmbCostChangeRes[];
}

/**
 * HAND-ADDED (zinc ktmb actual cost). POST Booking/ktmb-fx body: rate is the
 * MYR→SGD conversion (SGD per 1 MYR, rate > 0); effectiveAt omitted/null =
 * immediate.
 */
export interface SetKtmbFxReq {
  /** @format double */
  rate: number;
  /** @format date-time */
  effectiveAt?: string | null;
}

/**
 * HAND-ADDED (zinc ktmb actual cost). One MYR→SGD FX rate row (insert-only,
 * effective-dated). rate = SGD per 1 MYR.
 */
export interface KtmbFxRateRes {
  /** @format double */
  rate: number;
  /** @format date-time */
  effectiveAt: string;
  /** @format date-time */
  createdAt: string;
}

/**
 * HAND-ADDED (zinc ktmb actual cost). GET Booking/ktmb-fx response:
 * current = the rate in effect right now (null before any rate is set);
 * recent = recent rate rows, most recent first.
 */
export interface KtmbFxRes {
  current?: KtmbFxRateRes | null;
  recent: KtmbFxRateRes[];
}

/**
 * HAND-ADDED (zinc PR #39). POST Booking/ktmb-cost body: direction is
 * "JToW" | "WToJ"; cost 0–10000; effectiveAt omitted/null = immediate.
 */
export interface SetKtmbCostReq {
  direction: string;
  /** @format double */
  cost: number;
  /** @format date-time */
  effectiveAt?: string | null;
}

/**
 * HAND-ADDED (zinc PR #39). POST Payment/gateway-fees/sync response:
 * synced = fee rows upserted; missing = intent ids Airwallex has no fee for
 * yet (they post with delay); hasMore = the range had more intents than one
 * sync pass covers — run it again.
 */
export interface GatewayFeeSyncRes {
  /** @format int32 */
  synced: number;
  missing: string[];
  hasMore: boolean;
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
