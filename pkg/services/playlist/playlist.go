package playlist

import (
	"context"

	"github.com/grafana/grafana/pkg/coremodel/playlist"
)

type Service interface {
	Create(context.Context, *CreatePlaylistCommand) (*Playlist, error)
	Update(context.Context, *UpdatePlaylistCommand) (*PlaylistDTO, error)
	Get(context.Context, *GetPlaylistByUidQuery) (*Playlist, error)
	Delete(ctx context.Context, cmd *DeletePlaylistCommand) error

	// Get a playlist with the items attached
	GetWithItems(context.Context, *GetPlaylistByUidQuery) (*playlist.Model, error)

	// NOTE: the frontend only calls this with an empty "name" parameter
	Search(context.Context, *GetPlaylistsQuery) (Playlists, error)
}
