import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react'
import TagMentionChip from '../components/TagMentionChip'
import type { MentionKind } from '../lib/mentionCandidates'

/** 본문 태그 노드. 편집기와 글 보기가 같은 박스를 그려요. */
export default function TagMentionView({ node, editor }: ReactNodeViewProps) {
  return (
    <NodeViewWrapper as="span">
      <TagMentionChip
        kind={node.attrs.kind as MentionKind}
        id={node.attrs.id as string}
        label={node.attrs.label as string}
        inEditor={editor.isEditable}
      />
    </NodeViewWrapper>
  )
}
