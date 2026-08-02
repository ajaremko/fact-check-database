import styled, { Keyframes } from 'styled-components'

import { C } from '@/lib/theme'

const Button = styled.button<{ $delay: number; $fadeIn: Keyframes }>`
  position: absolute;
  left: 50%;
  bottom: 2rem;
  transform: translateX(-50%);
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(48px);
  -webkit-backdrop-filter: blur(48px);
  box-shadow: 4px 4px 20px rgba(0, 0, 0, 0.3);
  color: ${C.textPrimary};
  cursor: pointer;
  opacity: 0;
  animation: ${({ $fadeIn }) => $fadeIn} 2.4s ease forwards;
  animation-delay: ${({ $delay }) => $delay}s;
  transition: background-color 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.01);
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 1;
  }
`

export function ScrollButton({
  children,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button {...props}>
      {children ?? (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      )}
    </Button>
  )
}
