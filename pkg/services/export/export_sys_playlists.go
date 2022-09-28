package export

import (
	"fmt"
	"path/filepath"
	"time"

	"github.com/grafana/grafana/pkg/services/playlist"
)

func exportSystemPlaylists(helper *commitHelper, job *gitExportJob) error {
	res, err := job.playlistService.Search(helper.ctx, &playlist.GetPlaylistsQuery{
		OrgId: helper.orgID,
		Limit: 500000,
	})
	if err != nil {
		return err
	}

	if len(res) < 1 {
		return nil // nothing
	}

	gitcmd := commitOptions{
		when:    time.Now(),
		comment: "Export playlists",
	}

	for _, info := range res {
		p, err := job.playlistService.GetWithItems(helper.ctx, &playlist.GetPlaylistByUidQuery{
			OrgId: helper.orgID,
			UID:   info.UID,
		})
		if err != nil {
			return err
		}

		gitcmd.body = append(gitcmd.body, commitBody{
			fpath: filepath.Join(helper.orgDir, "system", "playlists", fmt.Sprintf("%s-playlist.json", p.Uid)),
			body:  prettyJSON(p),
		})
	}

	return helper.add(gitcmd)
}
