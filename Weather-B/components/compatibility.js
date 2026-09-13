// Free Weather-B compatibility state. No analytics or remote tracking is performed here.
var sunriseTime = NaN;
var sunsetTime = NaN;
var noonTime = NaN;
var solarMidnight = NaN;

// Legacy UI handlers may still call this name. Keep it local and inert rather than
// restoring the removed telemetry implementation.
var mp_event = function () {};
