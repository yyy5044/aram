import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react'
import VideoPlayer from './VideoPlayer'

/** 편집기·글 보기에서 영상 노드를 그려요. src가 있으면 클립을 재생해요. */
export default function VideoNodeView({ node }: ReactNodeViewProps) {
  const src = node.attrs.src as string | null
  return <NodeViewWrapper className="my-4">{src && <VideoPlayer src={src} />}</NodeViewWrapper>
}
