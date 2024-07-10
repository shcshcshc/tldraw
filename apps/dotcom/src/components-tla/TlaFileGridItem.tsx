import { Link } from 'react-router-dom'
import { useValue } from 'tldraw'
import { useApp } from '../hooks/useAppState'
import { useLocalThumbnail } from '../hooks/useLocalThumbnail'
import { TldrawAppFile } from '../utils/tla/schema/TldrawAppFile'
import { TldrawAppStarRecordType } from '../utils/tla/schema/TldrawAppStar'
import { getFileUrl } from '../utils/tla/urls'
import { TlaIcon } from './TlaIcon'
import { TlaSpinner } from './TlaSpinner'

export function TlaFileGridItem({ id, name, createdAt, workspaceId }: TldrawAppFile) {
	const app = useApp()
	const star = useValue(
		'star',
		() => {
			const { auth } = app.getSessionState()
			if (!auth) return false
			return app.getAll('star').find((r) => r.fileId === id && r.userId === auth.userId)
		},
		[id, app]
	)

	const imageUrl = useLocalThumbnail(id)

	return (
		<div className="tla_page__grid_item">
			<div className="tla_page__grid_item__content">
				<div className="tla_page__grid_item_top">
					{imageUrl ? (
						<div
							className="tla_page__grid_item_thumbnail"
							style={{ backgroundImage: `url(${imageUrl})` }}
						/>
					) : (
						<TlaSpinner />
					)}
				</div>
				<div className="tla_page__grid_item_bottom">
					<div className="tla_page__item_title tla_text_ui__regular">
						{name || new Date(createdAt).toLocaleString('en-gb')}
					</div>
					<div className="tla_page__item_details tla_text_ui__small">
						<div>Last edited 2 hours ago</div>
						<div className="tla_page__grid_item_collaborators" />
					</div>
				</div>
			</div>
			<Link to={getFileUrl(workspaceId, id)} className="tla_page__item_link" />
			<button
				className="tla_page__item_star"
				data-starred={!!star}
				onClick={() => {
					if (star) {
						app.store.remove([star.id])
					} else {
						const { auth } = app.getSessionState()
						if (!auth) return false
						app.store.put([
							TldrawAppStarRecordType.create({
								fileId: id,
								userId: auth.userId,
								workspaceId: workspaceId,
							}),
						])
					}
				}}
			>
				<TlaIcon icon={star ? 'star-fill' : 'star'} />
			</button>
			<button className="tla_page__item_menu">
				<TlaIcon icon="more" />
			</button>
		</div>
	)
}
