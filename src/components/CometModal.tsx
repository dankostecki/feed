'use client'

import { useEffect, useState } from 'react'
import { NewsItem } from '@/lib/rss'

interface Props {
  item: NewsItem
  onClose: () => void
}

const ACTIONS = [
  {
    label: 'PODSUMOWANIE',
    icon: '◆',
    desc: 'Kluczowe punkty w liście',
    task: 'przygotuj zwięzłe podsumowanie w formie wypunktowanej listy. Wyodrębnij kluczowe informacje, dane liczbowe, decyzje instytucji oraz ich potencjalny wpływ na rynki finansowe. Odpowiedź w języku polskim. Na końcu umieść sekcję „Źródło:" z bezpośrednim linkiem do oryginalnego artykułu.',
  },
  {
    label: 'ANALIZA',
    icon: '◈',
    desc: 'Pełna analiza ze szczegółami',
    task: 'przeprowadź szczegółową analizę. Uwzględnij wszystkie istotne fakty, dane makroekonomiczne, stanowiska decydentów, kontekst rynkowy oraz implikacje dla polityki monetarnej i fiskalnej. Wskaż powiązania z bieżącą sytuacją gospodarczą. Odpowiedź w języku polskim, ton profesjonalny i analityczny. Na końcu umieść sekcję „Źródło:" z bezpośrednim linkiem do oryginalnego artykułu.',
  },
  {
    label: 'POST NA X',
    icon: '✦',
    desc: 'Profesjonalny wpis 280 znaków',
    task: 'napisz profesjonalny, zwięzły wpis na platformę X (dawniej Twitter). Wpis powinien być merytoryczny, zawierać kluczową informację i jej znaczenie dla rynków. Użyj profesjonalnego tonu odpowiedniego dla branży finansowej. Dodaj odpowiednie hashtagi. Zmieść się w 280 znakach. Odpowiedź w języku polskim. Na końcu umieść sekcję „Źródło:" z bezpośrednim linkiem do oryginalnego artykułu.',
  },
  {
    label: 'KOMBO',
    icon: '★',
    desc: 'Wszystko powyżej w jednym',
    task: 'wykonaj trzy zadania:\n\n1. PODSUMOWANIE — wypunktowana lista kluczowych informacji, danych liczbowych i decyzji instytucji wraz z ich wpływem na rynki.\n\n2. PEŁNA ANALIZA — szczegółowy przegląd wszystkich faktów, danych makroekonomicznych, stanowisk decydentów, kontekstu rynkowego i implikacji dla polityki monetarnej i fiskalnej.\n\n3. WPIS NA X — profesjonalny, zwięzły post na platformę X z kluczową informacją, jej znaczeniem dla rynków i odpowiednimi hashtagami (maks. 280 znaków).\n\nOdpowiedź w języku polskim, ton profesjonalny i analityczny. Na końcu umieść sekcję „Źródło:" z bezpośrednim linkiem do oryginalnego artykułu.',
  },
]

export default function CometModal({ item, onClose }: Props) {
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  function handleCopy(task: string, label: string) {
    const text = 'Na podstawie tego artykułu ' + task + '\n\nArtykuł: ' + item.title
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        onClick={onClose}
      />

      {/* Modal panel */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="pointer-events-auto w-full font-mono flex flex-col"
          style={{
            maxWidth: '400px',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-[12px]" style={{ color: 'var(--text-ui)' }}>⚡</span>
              <span
                className="text-[11px] font-bold tracking-[0.15em] uppercase"
                style={{ color: 'var(--text-hi)' }}
              >
                COMET AI
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center border rounded-sm text-[12px] transition-all"
              style={{ color: 'var(--text-ui)', borderColor: 'var(--border)' }}
            >
              ✕
            </button>
          </div>

          {/* Article title */}
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-dim)' }}>
            <p
              className="text-[11px] leading-relaxed line-clamp-2"
              style={{ color: 'var(--text-md)' }}
            >
              {item.title}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1.5 p-3">
            {ACTIONS.map((action) => {
              const isCopied = copied === action.label
              return (
                <button
                  key={action.label}
                  onClick={() => handleCopy(action.task, action.label)}
                  className="flex items-center gap-3 px-3.5 py-3 text-left border rounded-sm transition-all duration-150"
                  style={{
                    borderColor: isCopied ? 'var(--src-FED)' : 'var(--border)',
                    backgroundColor: 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isCopied) {
                      e.currentTarget.style.backgroundColor = 'var(--hover)'
                      e.currentTarget.style.borderColor = 'var(--text-dim)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isCopied) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.borderColor = 'var(--border)'
                    }
                  }}
                >
                  <span className="text-[14px] shrink-0" style={{ color: isCopied ? 'var(--src-FED)' : 'var(--src-ECB)' }}>
                    {isCopied ? '✓' : action.icon}
                  </span>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span
                      className="text-[11px] font-bold tracking-[0.12em]"
                      style={{ color: isCopied ? 'var(--src-FED)' : 'var(--text-hi)' }}
                    >
                      {isCopied ? 'SKOPIOWANO!' : action.label}
                    </span>
                    <span
                      className="text-[10px]"
                      style={{ color: 'var(--text-ui)' }}
                    >
                      {action.desc}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
