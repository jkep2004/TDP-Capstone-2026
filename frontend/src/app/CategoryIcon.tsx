import { House, Layers, ShoppingBag, TrainFront, Utensils, Zap } from 'lucide-react'

const icons = {
  food: Utensils,
  housing: House,
  other: Layers,
  shopping: ShoppingBag,
  travel: TrainFront,
  utilities: Zap,
}

export default function CategoryIcon({ name }: { name: string }) {
  const key = name.toLowerCase() as keyof typeof icons
  const Icon = Object.hasOwn(icons, key) ? icons[key] : Layers
  return (
    <span className="category-icon" data-category={key}>
      <Icon size={18} strokeWidth={1.7} aria-hidden="true" />
    </span>
  )
}
