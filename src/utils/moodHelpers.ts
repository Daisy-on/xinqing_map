export const MOODS = [
  { id: 1, name: '心累', color: '#c2b6ae', icon: '😮‍💨' },
  { id: 2, name: '生气', color: '#d97d7a', icon: '😠' },
  { id: 3, name: '兴奋', color: '#fbe278', icon: '😆' },
  { id: 4, name: '烦躁', color: '#97a3c3', icon: '😫' },
  { id: 5, name: '心动', color: '#f6b2c2', icon: '🥰' },
  { id: 6, name: '平静', color: '#acd69b', icon: '😐' },
  { id: 7, name: '伤心', color: '#a8d2f5', icon: '😢' },
  { id: 8, name: '开心', color: '#f2bb8b', icon: '😄' },
]

export const getMoodById = (id: number) => {
  return MOODS.find(m => m.id === id) || MOODS[5] // default to 平静
}
