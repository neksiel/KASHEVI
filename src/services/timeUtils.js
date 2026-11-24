/**
 * Utilidades puras de fecha y hora (sin desplazamientos de zona horaria UTC).
 */

function isValidDateString(dateStr) {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function getWeekday(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).getDay();
}

function timeToMinutes(timeStr) {
  if (typeof timeStr !== 'string' || !/^\d{2}:\d{2}(:\d{2})?$/.test(timeStr)) {
    throw new Error(`Formato de hora inválido: ${timeStr}`);
  }
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Rango de hora inválido: ${timeStr}`);
  }
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function minutesToSqlTime(totalMinutes) {
  return `${minutesToTime(totalMinutes)}:00`;
}

function intervalsOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

function getLocalDateAndMinutes(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return {
    fechaHoy: `${year}-${month}-${day}`,
    minutosAhora: now.getHours() * 60 + now.getMinutes(),
  };
}

function formatDateReadable(dateStr) {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

module.exports = {
  isValidDateString,
  getWeekday,
  timeToMinutes,
  minutesToTime,
  minutesToSqlTime,
  intervalsOverlap,
  getLocalDateAndMinutes,
  formatDateReadable,
};
