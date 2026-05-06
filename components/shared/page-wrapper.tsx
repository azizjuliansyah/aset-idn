'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface PageWrapperProps {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
  contentClassName?: string
  wrapWithCard?: boolean
}

export function PageWrapper({
  title,
  description,
  children,
  className,
  contentClassName,
  wrapWithCard = true,
}: PageWrapperProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>}
          {description && <p className="text-muted-foreground text-sm">{description}</p>}
        </div>
      )}
      
      {wrapWithCard ? (
        <Card className="border border-border/50 p-4 shadow-sm bg-card overflow-hidden">
          <CardContent className={cn("p-1 md:p-2", contentClassName)}>
            {children}
          </CardContent>
        </Card>
      ) : (
        <div className={contentClassName}>
          {children}
        </div>
      )}
    </div>
  )
}
