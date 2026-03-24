import { Solar, Lunar, LunarYear } from 'lunar-javascript'

export interface LunarMonth {
  month: number
  isLeap: boolean
  label: string
}

/** 获取某农历年的所有月份（含闰月） */
export function getLunarMonths(year: number): LunarMonth[] {
  const ly = LunarYear.fromYear(year)
  const months = ly.getMonths()
  return months.map((m: any) => ({
    month: m.getMonth(),
    isLeap: m.isLeap(),
    label: m.isLeap() ? `闰${monthName(m.getMonth())}` : monthName(m.getMonth()),
  }))
}

/** 获取某农历月的天数 */
export function getLunarDays(year: number, month: number, isLeap: boolean): number {
  const ly = LunarYear.fromYear(year)
  const months = ly.getMonths()
  const target = months.find((m: any) => m.getMonth() === month && m.isLeap() === isLeap)
  return target ? target.getDayCount() : 30
}

/** 农历月份名 */
export function monthName(m: number): string {
  const names = ['', '正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月']
  return names[m] || `${m}月`
}

/** 农历日名 */
export function dayName(d: number): string {
  const tens = ['初', '十', '廿', '三十']
  const digits = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
  if (d === 10) return '初十'
  if (d === 20) return '二十'
  if (d === 30) return '三十'
  const t = Math.floor(d / 10)
  const u = d % 10
  return tens[t] + digits[u]
}

/** 农历转公历字符串 */
export function lunarToSolar(year: number, month: number, day: number, isLeap: boolean): string {
  try {
    const lunar = Lunar.fromYmd(year, isLeap ? -month : month, day)
    const solar = lunar.getSolar()
    return `${solar.getYear()}-${String(solar.getMonth()).padStart(2, '0')}-${String(solar.getDay()).padStart(2, '0')}`
  } catch {
    return ''
  }
}

/** 公历转农历 */
export function solarToLunar(dateStr: string): { year: number; month: number; day: number; isLeap: boolean; display: string } | null {
  try {
    const [y, m, d] = dateStr.split('-').map(Number)
    const solar = Solar.fromYmd(y, m, d)
    const lunar = solar.getLunar()
    const isLeap = lunar.getMonth() < 0
    const month = Math.abs(lunar.getMonth())
    return {
      year: lunar.getYear(),
      month,
      day: lunar.getDay(),
      isLeap,
      display: `${lunar.getYearInChinese()}年${isLeap ? '闰' : ''}${monthName(month)}${dayName(lunar.getDay())}`,
    }
  } catch {
    return null
  }
}

/** 格式化农历日期为存储字符串 */
export function formatLunarDate(year: number, month: number, day: number, isLeap: boolean): string {
  return `${year}-${isLeap ? '闰' : ''}${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** 解析存储的农历日期字符串 */
export function parseLunarDate(str: string): { year: number; month: number; day: number; isLeap: boolean } | null {
  const match = str.match(/^(\d{4})-(闰?)(\d{2})-(\d{2})$/)
  if (!match) return null
  return {
    year: parseInt(match[1]),
    isLeap: match[2] === '闰',
    month: parseInt(match[3]),
    day: parseInt(match[4]),
  }
}
