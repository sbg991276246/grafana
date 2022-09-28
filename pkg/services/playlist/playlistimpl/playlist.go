package playlistimpl

import (
	"context"

	playlistCM "github.com/grafana/grafana/pkg/coremodel/playlist"
	"github.com/grafana/grafana/pkg/services/playlist"
	"github.com/grafana/grafana/pkg/services/sqlstore/db"
	"github.com/grafana/grafana/pkg/setting"
)

type Service struct {
	store store
}

func ProvideService(db db.DB, cfg *setting.Cfg) playlist.Service {
	if cfg.IsFeatureToggleEnabled("newDBLibrary") {
		return &Service{
			store: &sqlxStore{
				sess: db.GetSqlxSession(),
			},
		}
	}
	return &Service{
		store: &sqlStore{
			db: db,
		},
	}
}

func (s *Service) Create(ctx context.Context, cmd *playlist.CreatePlaylistCommand) (*playlist.Playlist, error) {
	return s.store.Insert(ctx, cmd)
}

func (s *Service) Update(ctx context.Context, cmd *playlist.UpdatePlaylistCommand) (*playlist.PlaylistDTO, error) {
	return s.store.Update(ctx, cmd)
}

func (s *Service) Get(ctx context.Context, q *playlist.GetPlaylistByUidQuery) (*playlist.Playlist, error) {
	return s.store.Get(ctx, q)
}

// Get a playlist with the items attached ready for frontend consumption
func (s *Service) GetWithItems(ctx context.Context, cmd *playlist.GetPlaylistByUidQuery) (*playlistCM.Model, error) {
	p, err := s.store.Get(ctx, cmd)
	if err != nil {
		return nil, err
	}
	rawItems, err := s.store.GetItems(ctx, &playlist.GetPlaylistItemsByUidQuery{
		PlaylistUID: p.UID,
		OrgId:       cmd.OrgId,
	})
	if err != nil {
		return nil, err
	}
	count := len(rawItems)
	items := make([]playlistCM.PlaylistItem, count)
	for i := 0; i < count; i++ {
		items[i].Type = playlistCM.PlaylistItemType(rawItems[i].Type)
		items[i].Value = rawItems[i].Value
	}
	return &playlistCM.Model{
		Uid:      p.UID,
		Name:     p.Name,
		Interval: p.Interval,
		Items:    &items,
	}, nil
}

func (s *Service) Search(ctx context.Context, q *playlist.GetPlaylistsQuery) (playlist.Playlists, error) {
	return s.store.List(ctx, q)
}

func (s *Service) Delete(ctx context.Context, cmd *playlist.DeletePlaylistCommand) error {
	return s.store.Delete(ctx, cmd)
}
