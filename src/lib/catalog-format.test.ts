import { describe, expect, it } from "vitest";
import { imagesForColor } from "./catalog-format";

const single = {
  images: ["black-1.jpg", "general.jpg", "red-1.jpg", "black-2.jpg"],
  imageColorIds: ["matte-black", null, "matte-red", "matte-black"],
  secondaryColors: [],
};

describe("imagesForColor", () => {
  it("shows the chosen colour's photos first, then general shots", () => {
    expect(imagesForColor(single, "matte-black")).toEqual(["black-1.jpg", "black-2.jpg", "general.jpg"]);
    expect(imagesForColor(single, "matte-red")).toEqual(["red-1.jpg", "general.jpg"]);
  });

  it("falls back to general shots for a colour without its own photos", () => {
    expect(imagesForColor(single, "matte-white")).toEqual(["general.jpg"]);
  });

  it("shows every photo when a colour has none and there are no general shots", () => {
    const allTagged = { ...single, images: ["black.jpg", "red.jpg"], imageColorIds: ["matte-black", "matte-red"] };
    expect(imagesForColor(allTagged, "matte-white")).toEqual(["black.jpg", "red.jpg"]);
  });

  it("never switches photos on two-colour products", () => {
    const twoColour = { ...single, secondaryColors: [{ id: "matte-white", name: "Matte White", hex: "#fff" }] };
    expect(imagesForColor(twoColour, "matte-black")).toEqual(single.images);
  });

  it("keeps every photo when nothing is tagged or tags are missing", () => {
    expect(imagesForColor({ ...single, imageColorIds: undefined }, "matte-black")).toEqual(single.images);
    expect(imagesForColor({ ...single, imageColorIds: [null, null, null, null] }, "matte-black")).toEqual(single.images);
    expect(imagesForColor(single, undefined)).toEqual(single.images);
  });
});
