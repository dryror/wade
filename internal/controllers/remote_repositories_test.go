package controllers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"

	"wade/internal/models/remoterepositories"
)

func TestRemoteRepositoryListReturnsEmptyLocalWorkspaceCollection(t *testing.T) {
	handler := NewRemoteRepositories(
		fakeRemoteRepositoriesModel{items: []remoterepositories.RemoteRepository{{ID: "example/wade"}}},
		&fakeRepositoriesModel{workspaceIDsByRemote: map[string][]string{}},
	)
	response := httptest.NewRecorder()

	handler.List(response, httptest.NewRequest(http.MethodGet, "/api/v1/remote-repositories", nil))

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d", response.Code)
	}
	var body RemoteRepositoryList
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if len(body.Items) != 1 || body.Items[0].LocalWorkspaceIDs == nil || len(body.Items[0].LocalWorkspaceIDs) != 0 {
		t.Fatalf("items = %#v, want one repository with an empty local workspace collection", body.Items)
	}
}

func TestRemoteRepositoryListUsesOneBulkLocalMapping(t *testing.T) {
	repositoryModel := &fakeRepositoriesModel{workspaceIDsByRemote: map[string][]string{"example/wade": {"wade"}}}
	handler := NewRemoteRepositories(fakeRemoteRepositoriesModel{items: []remoterepositories.RemoteRepository{{ID: "example/wade"}}}, repositoryModel)
	response := httptest.NewRecorder()

	handler.List(response, httptest.NewRequest(http.MethodGet, "/api/v1/remote-repositories", nil))

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d", response.Code)
	}
	if repositoryModel.workspaceMappingCalls != 1 {
		t.Fatalf("mapping calls = %d, want 1", repositoryModel.workspaceMappingCalls)
	}
	if !reflect.DeepEqual(repositoryModel.workspaceIDsByRemote["example/wade"], []string{"wade"}) {
		t.Fatalf("workspace mapping = %#v", repositoryModel.workspaceIDsByRemote)
	}
}
