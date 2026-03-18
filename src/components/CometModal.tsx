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

function getArticleLink(item: NewsItem): string {
  if (item.link && item.link.includes('news.google.com')) {
    const cleanTitle = item.title.replace(/\s*-\s*(Bloomberg|Reuters)$/i, '')
    return `https://www.google.com/search?q=${encodeURIComponent(cleanTitle)}`
  }
  return item.link || '#'
}

export default function CometModal({ item, onClose }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (selected) setSelected(null); else onClose() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, selected])

  function handleSelect(task: string, label: string) {
    const text = 'Na podstawie tego artykułu ' + task + '\n\nArtykuł: ' + item.title
    navigator.clipboard.writeText(text)
    setSelected(label)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const articleLink = getArticleLink(item)

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
              onClick={() => { if (selected) setSelected(null); else onClose() }}
              className="w-7 h-7 flex items-center justify-center border rounded-sm text-[12px] transition-all"
              style={{ color: 'var(--text-ui)', borderColor: 'var(--border)' }}
            >
              {selected ? '←' : '✕'}
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

          {/* Step 1: Choose command */}
          {!selected && (
            <div className="flex flex-col gap-1.5 p-3">
              {ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleSelect(action.task, action.label)}
                  className="flex items-center gap-3 px-3.5 py-3 text-left border rounded-sm transition-all duration-150"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'transparent' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--hover)'
                    e.currentTarget.style.borderColor = 'var(--text-dim)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.borderColor = 'var(--border)'
                  }}
                >
                  <span className="text-[14px] shrink-0" style={{ color: 'var(--src-ECB)' }}>
                    {action.icon}
                  </span>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span
                      className="text-[11px] font-bold tracking-[0.12em]"
                      style={{ color: 'var(--text-hi)' }}
                    >
                      {action.label}
                    </span>
                    <span
                      className="text-[10px]"
                      style={{ color: 'var(--text-ui)' }}
                    >
                      {action.desc}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Prompt copied → direct link to article */}
          {selected && (
            <div className="flex flex-col gap-3 p-4">
              {/* Confirmation */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-sm"
                style={{ backgroundColor: 'var(--src-FED-bg)', border: '1px solid var(--src-FED-bd)' }}>
                <span className="text-[13px]" style={{ color: 'var(--src-FED)' }}>✓</span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-bold tracking-wider" style={{ color: 'var(--src-FED)' }}>
                    {copied ? 'SKOPIOWANO!' : 'PROMPT GOTOWY'}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--text-ui)' }}>
                    {selected} — wklej prompt w AI
                  </span>
                </div>
              </div>

              {/* Direct link button */}
              <a
                href={articleLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 px-4 py-3.5 text-center border rounded-sm transition-all duration-150 no-underline"
                style={{
                  color: 'var(--src-ECB)',
                  backgroundColor: 'var(--src-ECB-bg)',
                  borderColor: 'var(--src-ECB-bd)',
                  boxShadow: '0 0 12px var(--src-ECB-bd)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 20px var(--src-ECB-bd)' }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 12px var(--src-ECB-bd)' }}
                onClick={() => { setTimeout(onClose, 300) }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
                <span className="text-[12px] font-bold tracking-[0.15em] uppercase">
                  OTWÓRZ ARTYKUŁ
                </span>
              </a>

              {/* Pick another command */}
              <button
                onClick={() => setSelected(null)}
                className="text-[10px] font-mono tracking-widest py-2 transition-colors"
                style={{ color: 'var(--text-ui)' }}
              >
                ← INNY PROMPT
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
