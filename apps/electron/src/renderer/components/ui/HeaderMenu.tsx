/**
 * HeaderMenu
 *
 * A "..." dropdown menu for panel headers with built-in Open in New Window action.
 * Pass page-specific menu items as children; they appear above the separator.
 * Optionally includes a "Learn More" link to documentation when helpFeature is provided.
 */

import * as React from 'react'
import { MoreHorizontal, AppWindow, ExternalLink } from 'lucide-react'
import { HeaderIconButton } from './HeaderIconButton'
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from './dropdown-menu'
import {
  StyledDropdownMenuContent,
  StyledDropdownMenuItem,
  StyledDropdownMenuSeparator,
} from './styled-dropdown'
import { type DocFeature, getDocUrl } from '@iweather/shared/docs/doc-links'

interface HeaderMenuProps {
  /** Route string for Open in New Window action */
  route: string
  /** Page-specific menu items (rendered before Open in New Window) */
  children?: React.ReactNode
  /** Documentation feature - when provided, adds a "Learn More" link to docs */
  helpFeature?: DocFeature
}

export function HeaderMenu({ route, children, helpFeature }: HeaderMenuProps) {
  const handleOpenInNewWindow = async () => {
    const separator = route.includes('?') ? '&' : '?'
    const url = `craftagents://${route}${separator}window=focused`
    try {
      await window.electronAPI?.openUrl(url)
    } catch (error) {
      console.error('[HeaderMenu] openUrl failed:', error)
    }
  }

  const handleLearnMore = helpFeature ? () => {
    window.electronAPI?.openUrl(getDocUrl(helpFeature))
  } : undefined

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <HeaderIconButton icon={<MoreHorizontal className="h-4 w-4" />} />
      </DropdownMenuTrigger>
      <StyledDropdownMenuContent align="end">
        {children}
        {children && <StyledDropdownMenuSeparator />}
        <StyledDropdownMenuItem onClick={handleOpenInNewWindow}>
          <AppWindow className="h-3.5 w-3.5" />
          <span className="flex-1">在新窗口中打开</span>
        </StyledDropdownMenuItem>
        {/* 隐藏"了解更多"链接
        {helpFeature && (
          <>
            <StyledDropdownMenuSeparator />
            <StyledDropdownMenuItem onClick={handleLearnMore}>
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="flex-1">了解更多</span>
            </StyledDropdownMenuItem>
          </>
        )}
        */}
      </StyledDropdownMenuContent>
    </DropdownMenu>
  )
}
