export const MOODS = [
  { id: 1, name: '开心', color: '#FFD93D', icon: '😄' },
  { id: 2, name: '期待', color: '#FFA94D', icon: '🤩' },
  { id: 3, name: '释然', color: '#A66CFF', icon: '😌' },
  { id: 4, name: '平静', color: '#6BCB77', icon: '😐' },
  { id: 5, name: '想家', color: '#8D6E63', icon: '🥺' },
  { id: 6, name: '疲惫', color: '#4D96FF', icon: '😮‍💨' },
  { id: 7, name: '孤独', color: '#6D8299', icon: '👤' },
  { id: 8, name: '委屈', color: '#FF8E9E', icon: '😢' },
  { id: 9, name: '焦虑', color: '#FF6B6B', icon: '😖' },
  { id: 10, name: '烦躁', color: '#FF7F50', icon: '😫' },
]

export type MoodItem = (typeof MOODS)[number]

export const getMoodById = (id: number): MoodItem => {
  return MOODS.find((m) => m.id === id) ?? MOODS[3] ?? MOODS[0]!
}
