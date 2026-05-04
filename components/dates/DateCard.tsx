import { View, Text, Pressable } from 'react-native'

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
}

interface Props {
  date:    any
  onPress: () => void
}

export default function DateCard({ date, onPress }: Props) {
  const days    = daysUntil(date.date)
  const isPast  = days < 0
  const isToday = days === 0

  let statusText: string
  let statusColor: string
  if (isToday)      { statusText = 'Today!';                   statusColor = '#f59e0b' }
  else if (isPast)  { statusText = `${Math.abs(days)}d ago`;   statusColor = '#94a3b8' }
  else if (days === 1) { statusText = 'Tomorrow';              statusColor = '#3b82f6' }
  else              { statusText = `In ${days} days`;          statusColor = '#0f172a' }

  const hasReminders = date.reminder_1 || date.reminder_2

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 16,
        marginHorizontal: 16,
        marginBottom: 10,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        opacity: isPast ? 0.6 : 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      {/* Date number block */}
      <View style={{
        width: 52, height: 56, borderRadius: 14,
        backgroundColor: isToday ? '#0f172a' : isPast ? '#f1f5f9' : '#f8fafc',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        borderWidth: isToday ? 0 : 1, borderColor: '#e2e8f0',
      }}>
        <Text style={{ fontSize: 24, lineHeight: 28 }}>{date.emoji}</Text>
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: isPast ? '#64748b' : '#0f172a', marginBottom: 2 }} numberOfLines={1}>
          {date.title}
        </Text>
        <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>
          {formatDate(date.date)}
        </Text>
        {date.description ? (
          <Text style={{ fontSize: 12, color: '#94a3b8' }} numberOfLines={1}>{date.description}</Text>
        ) : null}
      </View>

      {/* Right side: countdown + reminder indicator */}
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <View style={{ backgroundColor: isToday ? '#fef3c7' : '#f1f5f9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: statusColor }}>{statusText}</Text>
        </View>
        {hasReminders && <Text style={{ fontSize: 14 }}>🔔</Text>}
      </View>
    </Pressable>
  )
}
