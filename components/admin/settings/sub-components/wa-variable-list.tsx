'use client'

import { HelpCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface WaVariableListProps {
  variables: string[]
  onSelect: (variable: string) => void
}

export function WaVariableList({ variables, onSelect }: WaVariableListProps) {
  return (
    <div className="bg-muted/30 border rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Variabel Tersedia</span>
        <Tooltip>
          <TooltipTrigger render={<HelpCircle size={14} className="text-muted-foreground cursor-help" />} />
          <TooltipContent>
            Klik variabel untuk memasukkannya ke dalam template
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="flex flex-wrap gap-2">
        {variables.map((variable) => (
          <button
            key={variable}
            type="button"
            onClick={() => onSelect(variable)}
            className="px-2.5 py-1 text-xs font-mono bg-background border rounded-md hover:border-primary hover:text-primary transition-colors"
          >
            {variable}
          </button>
        ))}
      </div>
    </div>
  )
}
