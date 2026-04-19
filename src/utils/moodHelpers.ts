import kaixin from '@/assets/iocn/emoji/1kaixin.png'
import qidai from '@/assets/iocn/emoji/2qidai.png'
import shiran from '@/assets/iocn/emoji/3shiran.png'
import pingjing from '@/assets/iocn/emoji/4pingjing.png'
import xiangjia from '@/assets/iocn/emoji/5xiangjia.png'
import pibei from '@/assets/iocn/emoji/6pibei.png'
import gudu from '@/assets/iocn/emoji/7gudu.png'
import weiqv from '@/assets/iocn/emoji/8weiqv.png'
import jiaolv from '@/assets/iocn/emoji/9jiaolv.png'
import fanzao from '@/assets/iocn/emoji/10fanzao.png'

export const MOODS = [
  { id: 1, name: '开心', color: '#FFD93D', icon: kaixin },
  { id: 2, name: '期待', color: '#FFA94D', icon: qidai },
  { id: 3, name: '释然', color: '#A66CFF', icon: shiran },
  { id: 4, name: '平静', color: '#6BCB77', icon: pingjing },
  { id: 5, name: '想家', color: '#8D6E63', icon: xiangjia },
  { id: 6, name: '疲惫', color: '#4D96FF', icon: pibei },
  { id: 7, name: '孤独', color: '#6D8299', icon: gudu },
  { id: 8, name: '委屈', color: '#FF8E9E', icon: weiqv },
  { id: 9, name: '焦虑', color: '#FF6B6B', icon: jiaolv },
  { id: 10, name: '烦躁', color: '#FF7F50', icon: fanzao },
]

export type MoodItem = (typeof MOODS)[number]

export const getMoodById = (id: number): MoodItem => {
  return MOODS.find((m) => m.id === id) ?? MOODS[3] ?? MOODS[0]!
}

export const preloadMoodIcons = () => {
  MOODS.forEach((m) => {
    const img = new Image()
    img.src = m.icon
  })
}
