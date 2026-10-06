package settings

import (
	"reflect"
	"testing"
)

func TestParseSettingsAppliesMissingFieldDefaults(t *testing.T) {
	persisted, err := parseSettings([]byte(`{"workspaceDirectories":["~/Code"]}`))
	if err != nil {
		t.Fatalf("parseSettings() error = %v", err)
	}
	if !reflect.DeepEqual(persisted.settings.Agents, defaultAgents) {
		t.Fatalf("Agents = %#v, want defaults", persisted.settings.Agents)
	}
	if persisted.settings.Shell != "" || persisted.settings.OpenWorktreesInNewTabs || persisted.settings.Linear.Enabled || persisted.settings.Linear.Workspace != "" {
		t.Fatalf("default settings = %#v", persisted.settings)
	}
}

func TestParseSettingsAppliesConfiguredValues(t *testing.T) {
	persisted, err := parseSettings([]byte(`{
		"workspaceDirectories":["~/Code"],
		"shell":" /bin/zsh ",
		"agents":[{"name":"Custom","command":"custom-agent","default":true}],
		"copyIgnoredFilesOnWorktreeCreation":true,
		"openWorktreesInNewTabs":true,
		"worktreeCopyExcludes":["node_modules"],
		"themeMode":"system",
		"shortcutModifier":"meta",
		"linear":{"enabled":true,"workspace":" Example_Workspace "}
	}`))
	if err != nil {
		t.Fatalf("parseSettings() error = %v", err)
	}

	settings := persisted.settings
	if settings.Shell != "/bin/zsh" || !settings.CopyIgnoredFilesOnWorktreeCreation || !settings.OpenWorktreesInNewTabs {
		t.Fatalf("settings = %#v", settings)
	}
	if len(settings.Agents) != 1 || settings.Agents[0].Name != "Custom" {
		t.Fatalf("Agents = %#v", settings.Agents)
	}
	if !reflect.DeepEqual(settings.WorktreeCopyExcludes, []string{"node_modules"}) || settings.ThemeMode != ThemeModeSystem || settings.ShortcutModifier != ShortcutModifierMeta {
		t.Fatalf("settings = %#v", settings)
	}
	if !settings.Linear.Enabled || settings.Linear.Workspace != "Example_Workspace" {
		t.Fatalf("Linear = %#v", settings.Linear)
	}
}

func TestParseSettingsPreservesEmptyArrays(t *testing.T) {
	persisted, err := parseSettings([]byte(`{"workspaceDirectories":[],"agents":[],"worktreeCopyExcludes":[]}`))
	if err != nil {
		t.Fatalf("parseSettings() error = %v", err)
	}
	settings := cloneSettings(persisted.settings)
	if settings.WorkspaceDirectories == nil || settings.Agents == nil || settings.WorktreeCopyExcludes == nil {
		t.Fatalf("empty arrays became nil: %#v", settings)
	}
}

func TestParseSettingsFallsBackForInvalidThemeMode(t *testing.T) {
	persisted, err := parseSettings([]byte(`{"themeMode":"sepia"}`))
	if err != nil {
		t.Fatalf("parseSettings() error = %v", err)
	}
	if persisted.settings.ThemeMode != ThemeModeDark {
		t.Fatalf("ThemeMode = %q", persisted.settings.ThemeMode)
	}
}

func TestParseSettingsFallsBackForInvalidShortcutModifier(t *testing.T) {
	persisted, err := parseSettings([]byte(`{"shortcutModifier":"alt"}`))
	if err != nil {
		t.Fatalf("parseSettings() error = %v", err)
	}
	if persisted.settings.ShortcutModifier != ShortcutModifierCtrl {
		t.Fatalf("ShortcutModifier = %q", persisted.settings.ShortcutModifier)
	}
}
