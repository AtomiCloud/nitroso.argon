{ pkgs, pkgs-2305, atomi, pkgs-feb-23-24 }:
let

  all = {
    atomipkgs = (
      with atomi;
      {
        inherit
          mirrord
          swagger_typescript_api
          infisical
          sg
          pls;
      }
    );
    nix-2305 = (
      with pkgs-2305;
      { }
    );
    feb-23-24 = (
      with pkgs-feb-23-24;
      {
        helm = kubernetes-helm;
        inherit
          coreutils
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
nix-2305 //
atomipkgs //
feb-23-24
