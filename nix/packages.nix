{ pkgs, pkgs-2411, atomi }:
let

  all = {
    atomipkgs = (
      with atomi;
      {
        inherit
          mirrord
          swagger_typescript_api
          sg
          pls;
      }
    );
    nix-2411 = (
      with pkgs-2411;
      {
        helm = kubernetes-helm;
        inherit
          coreutils
          infisical
          yq-go
          gnused
          gnugrep
          bash
          jq
          findutils
          doppler

          git

          bun
          treefmt
          gitlint
          shellcheck
          skopeo

          # infra
          k3d
          kubectl
          ;
      }
    );
  };
in
with all;
nix-2411 //
atomipkgs
