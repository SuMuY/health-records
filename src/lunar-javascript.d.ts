declare module 'lunar-javascript' {
  export class Solar {
    static fromYmd(year: number, month: number, day: number): Solar
    getYear(): number
    getMonth(): number
    getDay(): number
    getLunar(): Lunar
  }

  export class Lunar {
    static fromYmd(year: number, month: number, day: number): Lunar
    getYear(): number
    getMonth(): number
    getDay(): number
    getSolar(): Solar
    getYearInChinese(): string
  }

  export class LunarYear {
    static fromYear(year: number): LunarYear
    getMonths(): LunarMonth[]
  }

  export interface LunarMonth {
    getMonth(): number
    isLeap(): boolean
    getDayCount(): number
  }
}
