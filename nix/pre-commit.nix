{ packages, formatter, pre-commit-lib }:
pre-commit-lib.run {
  src = ./.;

  # hooks
  hooks = {
    # formatter
    treefmt = {
      enable = true;
      excludes = [
        "infra/.*chart.*/templates/.*(yaml|yml)"
        "infra/.*chart.*/.*(MD|md)"
        ".*(Changelog|README).+(MD|md)"
      ];
    };

    # linters From https://github.com/cachix/pre-commit-hooks.nix
    shellcheck = {
      enable = false;
    };

    a-oxc-lint = {
      enable = true;
      name = "Oxidation Linter";
      description = "OXC Javascript Linter";
      entry = "${packages.bun}/bin/bun ./node_modules/.bin/oxlint";
      language = "system";
      pass_filenames = false;
    };

    a-infisical = {
      enable = true;
      name = "Secrets Scanning";
      description = "Scan for possible secrets";
      entry = "${packages.infisical}/bin/infisical scan . -v";
      language = "system";
      pass_filenames = false;
    };

    a-infisical-staged = {
      enable = true;
      name = "Secrets Scanning (Staged files)";
      description = "Scan for possible secrets in staged files";
      entry = "${packages.infisical}/bin/infisical scan git-changes --staged -v";
      language = "system";
      pass_filenames = false;
    };

    a-gitlint = {
      enable = true;
      name = "Gitlint";
      description = "Lints git commit message";
      entry = "${packages.bash}/bin/bash -c '${packages.gitlint}/bin/gitlint --staged --msg-filename \"$(${packages.git}/bin/git rev-parse --git-path COMMIT_EDITMSG)\"'";
      language = "system";
      pass_filenames = false;
      stages = [ "commit-msg" ];
    };

    a-enforce-gitlint = {
      enable = true;
      name = "Enforce gitlint";
      description = "Enforce atomi_releaser conforms to gitlint";
      entry = "${packages.sg}/bin/sg gitlint";
      files = "(atomi_release\\.yaml|\\.gitlint)";
      language = "system";
      pass_filenames = false;
    };

    a-shellcheck = {
      enable = true;
      name = "Shell Check";
      entry = "${packages.shellcheck}/bin/shellcheck";
      files = ".*sh$";
      language = "system";
      pass_filenames = true;
    };

    a-enforce-exec = {
      enable = true;
      name = "Enforce Shell Script executable";
      entry = "${packages.coreutils}/bin/chmod +x";
      files = ".*sh$";
      language = "system";
      pass_filenames = true;
    };

    a-svelte-check = {
      enable = true;
      name = "Svelte Check";
      description = "Svelte Check via Bun";
      entry = "${packages.bun}/bin/bun run check";
      language = "system";
      pass_filenames = false;
    };

    # Dedicated i18n catalog-sync hook. Deliberately NOT named `a-svelte-check`
    # so it is not part of CI's `SKIP=a-svelte-check` set — this runs in both
    # local pre-commit and CI.
    a-i18n-check = {
      enable = true;
      name = "i18n Catalog Sync";
      description = "Ensure en/zh/ms i18n catalogs share one key set";
      entry = "${packages.bun}/bin/bun run i18n:check";
      language = "system";
      pass_filenames = false;
    };
  };

  settings = {
    treefmt = {
      package = formatter;
    };
  };
}
