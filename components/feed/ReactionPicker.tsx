import { View, Text, Pressable, Modal } from 'react-native'

const REACTIONS = [
  { key: 'like',    emoji: '👍', label: 'Like'    },
  { key: 'love',    emoji: '❤️', label: 'Love'    },
  { key: 'dislike', emoji: '👎', label: 'Dislike' },
]

interface Props {
  visible:       boolean
  myReactionType?: string
  onSelect:      (type: string) => void
  onClose:       () => void
}

export default function ReactionPicker({ visible, myReactionType, onSelect, onClose }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1" onPress={onClose}>
        <View className="absolute bottom-24 left-4 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 flex-row gap-1">
          {REACTIONS.map((r) => (
            <Pressable
              key={r.key}
              onPress={() => { onSelect(r.key); onClose() }}
              className={`items-center p-2 rounded-xl ${myReactionType === r.key ? 'bg-slate-100' : ''}`}
            >
              <Text style={{ fontSize: 28 }}>{r.emoji}</Text>
              <Text className="text-xs text-slate-400 font-medium mt-1">{r.label}</Text>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  )
}
