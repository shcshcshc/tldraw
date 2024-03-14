import {
	DefaultFontFamilies,
	Editor,
	Rectangle2d,
	ShapeUtil,
	SvgExportContext,
	TLNoteShape,
	TLOnEditEndHandler,
	getDefaultColorTheme,
	noteShapeMigrations,
	noteShapeProps,
	toDomPrecision,
} from '@tldraw/editor'
import { HyperlinkButton } from '../shared/HyperlinkButton'
import { useDefaultColorTheme } from '../shared/ShapeFill'
import { TextLabel } from '../shared/TextLabel'
import { FONT_FAMILIES, LABEL_FONT_SIZES, TEXT_PROPS } from '../shared/default-shape-constants'
import { getFontDefForExport } from '../shared/defaultStyleDefs'
import { getTextLabelSvgElement } from '../shared/getTextLabelSvgElement'

const NOTE_SIZE = 200
const MAX_TEXT_HEIGHT_COLLAPSED = 148.5

/** @public */
export class NoteShapeUtil extends ShapeUtil<TLNoteShape> {
	static override type = 'note' as const
	static override props = noteShapeProps
	static override migrations = noteShapeMigrations

	override canEdit = () => true
	override hideResizeHandles = () => true
	override hideSelectionBoundsFg = () => true

	getDefaultProps(): TLNoteShape['props'] {
		return {
			color: 'black',
			size: 'm',
			text: '',
			font: 'draw',
			align: 'middle',
			verticalAlign: 'middle',
			growY: 0,
			url: '',
			expanded: false,
		}
	}

	getHeight(shape: TLNoteShape) {
		const height = NOTE_SIZE
		if (shape.props.expanded) {
			return height + shape.props.growY
		}
		return height
	}

	getGeometry(shape: TLNoteShape) {
		const height = this.getHeight(shape)
		return new Rectangle2d({ width: NOTE_SIZE, height, isFilled: true })
	}

	component(shape: TLNoteShape) {
		const {
			id,
			type,
			props: { color, font, size, align, text, verticalAlign },
		} = shape

		// eslint-disable-next-line react-hooks/rules-of-hooks
		const theme = useDefaultColorTheme()
		const adjustedColor = color === 'black' ? 'yellow' : color

		let textToRender = text

		if (!shape.props.expanded) {
			textToRender = this.getTruncatedText(text, shape)
		}

		return (
			<>
				<div
					style={{
						position: 'absolute',
						width: NOTE_SIZE,
						height: this.getHeight(shape),
						pointerEvents: 'all',
					}}
				>
					<div
						className="tl-note__container"
						data-isexpanded={shape.props.expanded}
						style={{
							color: theme[adjustedColor].solid,
							backgroundColor: theme[adjustedColor].solid,
						}}
					>
						<div className="tl-note__scrim" />
						<TextLabel
							id={id}
							type={type}
							font={font}
							size={size}
							align={align}
							verticalAlign={verticalAlign}
							text={textToRender}
							labelColor="black"
							wrap
						/>
						{shape.props.growY > 0 && (
							<button
								className="tl-note__expand-button"
								onClick={() => {
									this.editor.updateShape({
										id: shape.id,
										type: 'note',
										props: { expanded: !shape.props.expanded },
									})
								}}
								onPointerDown={(e) => e.stopPropagation()}
							>
								{shape.props.expanded ? 'see less' : 'see more'}
							</button>
						)}
					</div>
				</div>
				{'url' in shape.props && shape.props.url && (
					<HyperlinkButton url={shape.props.url} zoomLevel={this.editor.getZoomLevel()} />
				)}
			</>
		)
	}

	indicator(shape: TLNoteShape) {
		return (
			<rect
				rx="6"
				width={toDomPrecision(NOTE_SIZE)}
				height={toDomPrecision(this.getHeight(shape))}
			/>
		)
	}

	override toSvg(shape: TLNoteShape, ctx: SvgExportContext) {
		ctx.addExportDef(getFontDefForExport(shape.props.font))
		const theme = getDefaultColorTheme({ isDarkMode: ctx.isDarkMode })
		const bounds = this.editor.getShapeGeometry(shape).bounds

		const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')

		const adjustedColor = shape.props.color === 'black' ? 'yellow' : shape.props.color

		const rect1 = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
		rect1.setAttribute('rx', '10')
		rect1.setAttribute('width', NOTE_SIZE.toString())
		rect1.setAttribute('height', bounds.height.toString())
		rect1.setAttribute('fill', theme[adjustedColor].solid)
		rect1.setAttribute('stroke', theme[adjustedColor].solid)
		rect1.setAttribute('stroke-width', '1')
		g.appendChild(rect1)

		const rect2 = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
		rect2.setAttribute('rx', '10')
		rect2.setAttribute('width', NOTE_SIZE.toString())
		rect2.setAttribute('height', bounds.height.toString())
		rect2.setAttribute('fill', theme.background)
		rect2.setAttribute('opacity', '.28')
		g.appendChild(rect2)

		const textElm = getTextLabelSvgElement({
			editor: this.editor,
			shape,
			font: DefaultFontFamilies[shape.props.font],
			bounds,
		})

		textElm.setAttribute('fill', theme.text)
		textElm.setAttribute('stroke', 'none')
		g.appendChild(textElm)

		return g
	}

	override onBeforeCreate = (next: TLNoteShape) => {
		return getGrowY(this.editor, next, next.props.growY)
	}

	override onBeforeUpdate = (prev: TLNoteShape, next: TLNoteShape) => {
		if (
			prev.props.text === next.props.text &&
			prev.props.font === next.props.font &&
			prev.props.size === next.props.size
		) {
			return
		}

		return getGrowY(this.editor, next, prev.props.growY)
	}

	override onEditEnd: TLOnEditEndHandler<TLNoteShape> = (shape) => {
		const {
			id,
			type,
			props: { text },
		} = shape

		if (text.trimEnd() !== shape.props.text) {
			this.editor.updateShapes([
				{
					id,
					type,
					props: {
						text: text.trimEnd(),
					},
				},
			])
		}
	}

	getTruncatedText(text: string, shape: TLNoteShape) {
		const opts = {
			overflow: 'wrap' as const,
			width: 200,
			height: this.getHeight(shape),
			padding: 16,
			fontSize: LABEL_FONT_SIZES[shape.props.size],
			fontWeight: 'normal',
			fontFamily: FONT_FAMILIES[shape.props.font],
			fontStyle: 'normal',
			lineHeight: TEXT_PROPS.lineHeight,
			textAlign: shape.props.align,
		}
		const spans = this.editor.textMeasure.measureTextSpans(shape.props.text, opts)
		const lines = []
		let currentLine = []
		let currentLineWidth = 0

		for (const span of spans) {
			if (currentLineWidth + span.box.w > opts.width - opts.padding * 2) {
				lines.push(currentLine)
				currentLine = []
				currentLineWidth = 0
			}
			currentLine.push(span)
			currentLineWidth += span.box.w
		}
		const maxLines = {
			s: 6,
			m: 5,
			l: 4,
			xl: 3,
		}

		if (lines.length + 1 > maxLines[shape.props.size]) {
			let textToTruncate = lines
				.slice(0, maxLines[shape.props.size])
				.map((line) => line.map((span) => span.text).join(''))
				.join('\n')
			// remove whitespace at the end of the string
			textToTruncate = textToTruncate.trimEnd()
			return (textToTruncate += '...')
		}
		return text
	}
}

function getGrowY(editor: Editor, shape: TLNoteShape, prevGrowY = 0) {
	const PADDING = 17

	const nextTextSize = editor.textMeasure.measureText(shape.props.text, {
		...TEXT_PROPS,
		fontFamily: FONT_FAMILIES[shape.props.font],
		fontSize: LABEL_FONT_SIZES[shape.props.size],
		maxWidth: NOTE_SIZE - PADDING * 2,
	})

	const nextHeight = nextTextSize.h + PADDING * 2

	let growY: number | null = null

	if (nextHeight > NOTE_SIZE) {
		growY = nextHeight - NOTE_SIZE
	} else {
		if (prevGrowY) {
			growY = 0
		}
	}

	if (growY !== null) {
		return {
			...shape,
			props: {
				...shape.props,
				growY,
			},
		}
	}
}
