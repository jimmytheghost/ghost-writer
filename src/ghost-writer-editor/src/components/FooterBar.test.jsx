import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import FooterBar from './FooterBar'

describe('FooterBar model dropdown', () => {
  it('updates the selected model from the custom footer dropdown', () => {
    const setSelectedModel = vi.fn()

    render(
      <FooterBar
        footerRef={null}
        isFooterCollapsed={false}
        setIsFooterCollapsed={() => {}}
        handleNew={() => {}}
        handleSaveClick={() => {}}
        handleLoadClick={() => {}}
        handleCopyClick={() => {}}
        isPreviewOpen={false}
        handleTogglePreview={() => {}}
        modKeyLabel="Cmd"
        selectedModel="llama3.1:8b"
        setSelectedModel={setSelectedModel}
        models={['qwen3-coder:30b', 'llama3.1:8b', 'llama3.2-vision:latest']}
        loadModels={() => {}}
        isLoadingModels={false}
        modelLoadStatus=""
        footerActionFeedback={null}
        isDark={true}
        onToggleTheme={() => {}}
        isAlwaysOnTop={false}
        handleAlwaysOnTopToggle={() => {}}
      />,
    )

    fireEvent.click(screen.getByLabelText('Ollama model'))
    fireEvent.click(screen.getByRole('option', { name: 'qwen3-coder:30b' }))

    expect(setSelectedModel).toHaveBeenCalledWith('qwen3-coder:30b')
  })
})
