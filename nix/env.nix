{ pkgs, packages }:
with packages;
{
  system = [
    coreutils
    findutils
    gnugrep
    gnused
    yq-go
    jq
  ];

  dev = [
    pls
    git
    swagger_typescript_api
    doppler
    skopeo
  ];

  infra = [
    k3d
    helm
    kubectl
    mirrord
  ];

  main = [
    infisical
    bun
  ];

  lint = [
    # core
    treefmt
    gitlint
    shellcheck
    sg
  ];

  releaser = [
    nodejs
    sg
    npm
  ];
}
