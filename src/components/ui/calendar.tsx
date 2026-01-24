'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  isBefore,
  startOfDay,
} from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from './button'

type CalendarProps = {
  selected?: Date | null
  onSelect?: (date: Date) => void
  availableDates?: Date[]
  className?: string
}

export function Calendar({
  selected,
  onSelect,
  availableDates = [],
  className,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date())

  const availableDateMap = React.useMemo(() => {
    const map = new Map<string, Date>()
    availableDates.forEach(d => map.set(format(d, 'yyyy-MM-dd'), d))
    return map
  }, [availableDates])

  const getAvailableDate = (date: Date): Date | undefined => {
    return availableDateMap.get(format(date, 'yyyy-MM-dd'))
  }

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <h2 className="text-sm font-medium">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    )
  }

  const renderDays = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map(day => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>
    )
  }

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)

    const rows = []
    let days = []
    let day = startDate

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const currentDay = day
        const isCurrentMonth = isSameMonth(day, monthStart)
        const isSelected = selected && isSameDay(day, selected)
        const availableDate = getAvailableDate(day)
        const isAvailable = !!availableDate
        const isPast = isBefore(day, startOfDay(new Date()))
        const isDisabled = !isCurrentMonth || isPast || !isAvailable

        days.push(
          <button
            key={day.toISOString()}
            type="button"
            disabled={isDisabled}
            onClick={() => !isDisabled && availableDate && onSelect?.(availableDate)}
            className={cn(
              'h-10 w-full rounded-md text-sm transition-colors',
              !isCurrentMonth && 'text-muted-foreground/30',
              isCurrentMonth && !isAvailable && !isPast && 'text-muted-foreground/50',
              isCurrentMonth && isPast && 'text-muted-foreground/30',
              isCurrentMonth && isAvailable && !isPast && 'hover:bg-accent',
              isSelected && 'bg-primary text-primary-foreground hover:bg-primary',
              isToday(day) && !isSelected && 'font-bold',
            )}
          >
            {format(day, 'd')}
          </button>
        )
        day = addDays(day, 1)
      }
      rows.push(
        <div key={day.toISOString()} className="grid grid-cols-7 gap-1">
          {days}
        </div>
      )
      days = []
    }

    return <div className="space-y-1">{rows}</div>
  }

  return (
    <div className={cn('p-4 border rounded-lg bg-card', className)}>
      {renderHeader()}
      {renderDays()}
      {renderCells()}
    </div>
  )
}
